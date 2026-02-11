#!/usr/bin/env python

# -*- coding: utf-8 -*-

#
# IMPORT MODULES
#

import configparser
from itertools import repeat
import json
import logging
import numpy as np
import os
import pandas as pd
import re
from scipy.stats import rankdata

from modules.TPMetricsSuper import TPMetricsSuper


#
# CLASSES AND FUNCTIONS
#

class TPMetrics(TPMetricsSuper):

    def __init__(self, workdir):

        logging.info('Initializing TPMetrics object')
        
        # Get parameters from config and set some constants
        TPMetricsSuper.__init__(self, workdir)

        # Working table
        self.df = self.readTable()

        self.LC = self.readLipidClasses()
        self.LC['bool'] = True

        # Organize columns
        self.cmmCol = [i for i in self.df.columns if i in self.cmmCol or 'Unnamed' in i]
        
        self.initCols = [
            i for i in self.df.columns.to_list() 
            if i not in [*self.i, *self.cmmCol, self.a, self.e, self.w]] # intensity and cmm columns in the end & modified w, a and e should not appear
        
        self.finalCols = self.initCols + \
            [self.tpc, self.s2argmaxp, self.s1, self.s2, self.tpcL_s3s, self.s2m, self.s2mF, self.sfinal, self.rank] + \
            self.cmmCol + self.i
        
        self.df = self.df.reset_index() # Generate column with index 

        # Ensure TP_Class column exists with correct name
        tp_class_cols = [c for c in self.df.columns if c.startswith('TP_Class')]
        if 'TP_Class' not in self.df.columns and len(tp_class_cols) > 0:
            self.df.rename(columns={tp_class_cols[0]: 'TP_Class'}, inplace=True)
        
        # correlation matrix between mz
        self.corr = self.df.loc[:, [self.m, self.rt, *self.i]].drop_duplicates().set_index([self.m, self.rt]).T.corr(method=self.corrType) 
        
        # map index to mz
        self.idx2mz = dict(list(zip(
            self.df.index.to_list(),
            self.df.loc[:, self.m].to_list()
        )))

        # Array containing correlation values under the null hypothesis; getNullH()
        self.VcorrH0 = np.array([])
        self.MaxVcorrH0 = 5

        logging.info('TPMetrics object initialized')

    def readTable(self):
        '''
        Read dataframe (from tablemerger) and "clean" columns with values separated by ' ; '.
        These values were joined in REname (they should not but well...) and they should be
        a single value (single annotation)
        '''
        df = pd.read_csv(os.path.join(self.workdir, self.infile), sep='\t')
        df[self.a] = [i.split(' ; ')[0] if type(i)==str else i for i in df[self.a_original].to_list()]
        df[self.e] = [i.split(' ; ')[0] if type(i)==str else i for i in df[self.e_original].to_list()]
        df[self.w] = [i.split(' ; ')[0] if type(i)==str else i for i in df[self.w_original].to_list()]
        return df


    def readLipidClasses(self):
        '''
        Read list containing classes of lipids
        '''

        with open(r'./src/TurboPutative-2.0-built/TPProcesser/TPMetrics/data/Lipid_Class.tsv', 'r') as f:
        #with open(r'./data/Lipid_Class.tsv', 'r') as f:
            return pd.DataFrame({self.tpc: [i.strip() for i in f]})


    def getClasses(self):
        '''
        Add to input table lipid classes (found in LMSD)
        '''

        dfl = list(zip(*[j for i,j in self.df.loc[:, ['index', self.n]].to_dict('list').items()]))
        dfl = [(index, name.split(' // ')) for index,name in dfl]

        # dataframe with possible lipid class, annotation index, and name index
        dfl = pd.DataFrame([
            (index_f, index_n, re.sub(r'LMSD{ ([^}]+) }', r'\1', name).split(' '))        
            for index, name_list in dfl
            for index_f, name, index_n in      
            list(zip(
                list(repeat(index, len(name_list))), 
                name_list, 
                list(range(len(name_list)))
            ))
        ], columns=['index', 'in', self.tpcL]).explode(self.tpcL, ignore_index=True).drop_duplicates()

        # map index of annotation to index of its possible name
        index2tpcL = dfl.loc[:, ['index', 'in']].drop_duplicates()

        # find possible lipid class present in LMSD (maintaining the first)
        dfl = pd.merge(
            dfl,
            self.LC,
            left_on=self.tpcL,
            right_on=self.tpc,
            how='left'
        ).dropna().drop_duplicates(subset=['index','in'], keep='first')

        dfl = pd.merge(
            index2tpcL,
            dfl,
            on=['index', 'in'],
            how='left'
        ).groupby(['index']).agg(list).reset_index()

        dfl[self.tpc] = [' // '.join([j for j in list(set(i)) if not pd.isna(j)]) for i in dfl[self.tpc]]

        self.df = pd.merge(
            self.df.drop(columns=[self.tpc], errors='ignore'),
            dfl.loc[:, ['index', self.tpcL, self.tpc]],
            on='index',
            how='left'
        )

    
    def getCorrelations(self):
        '''
        '''

        self.df = self.df.astype({self.w:str})
        
        self.getCorr(
            basedCol=self.w, 
            dtypeCol=np.float64, 
            rtwindow=self.rt1, 
            sa=self.s1a, 
            sm=self.s1m, 
            ss=self.s1s, 
            sn=self.s1n,
            saF=self.s1aF,
            smF=self.s1mF
        )

        self.getCorr(
            basedCol=self.tpc, 
            dtypeCol=str, 
            rtwindow=self.rt2, 
            sa=self.s2a, 
            sm=self.s2m, 
            ss=self.s2s, 
            sn=self.s2n,
            saF=self.s2aF,
            smF=self.s2mF
        )

        self.getNullH()
        
        self.getScoreMax(sim=self.s1m, simp=self.s1mp, sims=self.s1ms)
        self.getScoreMax(sim=self.s2m, simp=self.s2mp, sims=self.s2ms)
        
        self.getScoreSum(sia=self.s1a, sis=self.s1s, sin=self.s1n, siavg=self.s1avg, sisp=self.s1sp, siss=self.s1ss)
        self.getScoreSum(sia=self.s2a, sis=self.s2s, sin=self.s2n, siavg=self.s2avg, sisp=self.s2sp, siss=self.s2ss)
        
        self.getScoreAdduct()

        self.combineScores() # combine scores from Max and Sum (and adduct)

        self.getMaximumScores(basedCol=self.w, score=self.s1, argmaxp=self.s1argmaxp, argmaxs=self.s1argmaxs, argmax=self.s1argmax)
        self.getMaximumScores(basedCol=self.tpc, score=self.s2s3, argmaxp=self.s2argmaxp, argmaxs=self.s2argmaxs, argmax=self.s2argmax)
        
        self.df[self.s] = self.df.loc[:, self.s1argmaxs].fillna(0)+self.df.loc[:, self.s2argmaxs].fillna(0)
        
        self.applyErrorPenalty()
        
        self.getRank()

        # method to obtain a column indicating adduct score per name
        self.getName2AdductColumn()


    def getCorr(self, basedCol, dtypeCol, rtwindow, sa, sm, ss, sn, saF, smF):
        '''
        Correlations based on basedCol. Try to identify the same compound in different features. 
        Three columns with correlations will be added to self.df:
            - sa: [[],] List containing list of correlations (one per each elem in elem1 // elem2... of basedCol)
            - sm: [] List containing the maximum correlation in each list of sa
            - ss: [] List containing the sum of all correlations in each list of sa
        '''
        
        logging.info(f"Identify associated annotations based on {basedCol}")

        # Get a dataframe copy unfolding by molecular weight/lipid class (preserving the same index after unfold)
        df = self.df.loc[:, ['index',self.m, self.rt, basedCol]].copy()
        df[basedCol] = self.df.astype({basedCol:str})[basedCol].str.split(' // ')
        df = df.explode(
            basedCol, ignore_index=True
            ).dropna(
                axis=0, subset=[basedCol]
                ).astype(
                    {basedCol: dtypeCol}
                    )#.drop_duplicates(
                     #   subset=[self.m, self.rt, basedCol], keep='first'
                     #   )

        # rows without lipid class are '' instead of na
        df = df.loc[df[basedCol]!='', :]

        # This is the dataframe used to search associated features/annotations. One feature can have 
        # annotations with the same basedCol. We must remove the duplicates to avoid repeated intensities
        # and correlations
        df_wo_duplicates = df.drop_duplicates(subset=[self.m, self.rt, basedCol], keep='first')

        # Convert df to list of lists [(index, mz, rt, mw)]
        dfl = list(zip(*[j for i,j in df.to_dict('list').items()]))

        # Identify possible correlated elements [(index, [pair_index_1, pair_index_2])]
        idx2p = [
            (
                [index, w, m, rt],
                df_wo_duplicates.loc[
                    np.logical_and.reduce((
                        ~np.logical_and(
                            m == df_wo_duplicates.loc[:, self.m], 
                            rt == df_wo_duplicates.loc[:, self.rt]
                        ), # if mass and rt are the same, they are the same feature
                        rt-rtwindow <= df_wo_duplicates.loc[:, self.rt],
                        rt+rtwindow >= df_wo_duplicates.loc[:, self.rt],
                        w == df_wo_duplicates.loc[:, basedCol]
                    )),
                    ['index', self.m, self.rt]
                ].to_dict('list')
            )
            for index, m, rt, w in dfl
        ]

        idx2p = [
            (index_w_m_rt, pair_dict['index'], pair_dict[self.m], pair_dict[self.rt])
            for index_w_m_rt, pair_dict in idx2p
        ]

        # remove empty elements and replace indexes by correlation
        idx = pd.IndexSlice
        idx2p = [
            (
                index_w_m_rt, 
                self.corr.loc[(index_w_m_rt[2], index_w_m_rt[3]), [(i,j) for i,j in zip(pair_mass, pair_rt)]].to_numpy(),
                pair_mass,
                pair_rt
            ) 
            for index_w_m_rt, pair_index, pair_mass, pair_rt in idx2p if len(pair_index)>0
        ]

        
        
        #
        ### !!!!! REMOVE NEGATIVE CORRELATIONS FOR MW CASE
        if basedCol==self.w: 
            idx2p = [
                (index_w_m_rt, pair_corr[pair_corr>0], np.array(pair_mass)[pair_corr>0].tolist(), pair_rt)
                for index_w_m_rt, pair_corr, pair_mass, pair_rt in idx2p if sum(pair_corr>0)>0
            ]
        # 

        # add maximum and sum; build dataframe
        idx2p = pd.DataFrame(
            [
                [
                    *index_w_m_rt[:2], 
                    pair_corr.tolist(), 
                    abs(pair_corr[np.argmax(np.abs(pair_corr))]), 
                    np.sum(np.abs(pair_corr)), 
                    len(pair_corr),
                    pair_mass,
                    pair_mass[np.argmax(np.abs(pair_corr))]
                ]
                for index_w_m_rt, pair_corr, pair_mass, pair_rt in idx2p
            ], 
            columns=['index', basedCol, sa, sm, ss, sn, saF, smF]
        )

        # Add correlations to each unfolded element; and group by index (refold)
        df = pd.merge(
            df,
            idx2p,
            on=['index', basedCol],
            how='left'
        ).groupby('index').agg(list).reset_index()

        # Merge to original table based on index (could be a join)
        self.df = pd.merge(
            self.df,
            df.loc[:, ['index', sa, sm, ss, sn, saF, smF]],
            on='index',
            how='left'
        )


    def getNullH(self):
        '''
        Get correlations under the null hypothesis of no correlation
        This will be used to calculate empirical p-values
        '''

        logging.info("Calculating correlations under the null hypothesis")

        # Get maximum number of correlations associated to an annotation
        #maxn = self.df.loc[:, self.s1n].dropna().to_list()+self.df.loc[:, self.s2n].dropna().to_list()
        #maxn = [[j for j in i if not pd.isna(j)] for i in maxn]
        #maxn = int(max([max(i) for i in maxn if i!=[]]))

        # Get number of shuffling
        arr = self.df.loc[:, self.i].drop_duplicates().to_numpy()
        T = 100000 # Number of correlation values
        K = (2 * T)/(arr.shape[0]**2-arr.shape[0])
        K = int(np.ceil(K))

        # Convert matrix intensity into a vector; shuffle the vector; rebuild the matrix
        arrl = [arr.copy().reshape(arr.shape[0]*arr.shape[1]) for i in range(K)]
        _ = [np.random.shuffle(i) for i in arrl]
        arrl = [i.reshape(arr.shape) for i in arrl]

        # Calculate correlations
        Mcorr = [pd.DataFrame(i).T.corr(method=self.corrType).to_numpy() for i in arrl]

        # Get upper triangle of correlation matrix
        idx = np.triu_indices(arr.shape[0], 1)
        Vcorr = np.concatenate([M[idx[0], idx[1]] for M in Mcorr])

        # Get correlation distribution considering the addition
        VcorrH0 = [np.abs(Vcorr)]
        for n in range(2, self.MaxVcorrH0+1):#maxn+1):
            Vcorrl = [Vcorr.copy() for i in range(n)]
            _ = [np.random.shuffle(i) for i in Vcorrl]
            VcorrH0.append(np.sum(np.abs(Vcorrl), axis=0))
        
        self.VcorrH0 = np.array(VcorrH0)



    def getScoreMax(self, sim, simp, sims):
        '''
        Get score based on maximum correlation
        '''

        logging.info(f"Calculating score based on maximum correlation: {sims}")

        df = self.df.loc[:, ['index', sim]].dropna().explode(sim).fillna(0)
        df[simp] = [(self.VcorrH0[0, :]>i).sum()/self.VcorrH0.shape[1] for i in df[sim].to_list()] # Max (i) was converted to abs when defining
        df.loc[df[simp] == 0, simp] = 1/self.VcorrH0.shape[1]

        # FORMULA
        df[sims] = df[sim] * (-np.log10(df[simp]))

        self.df = pd.merge(
            self.df,
            df.groupby('index').agg(list).reset_index().loc[:, ['index', simp, sims]],
            on='index',
            how='left'
        )
    

    def getScoreSum(self, sia, sis, sin, siavg, sisp, siss):
        '''
        Get score based on all correlations
        '''

        logging.info("Calculating score based on sum of all correlations")

        df = self.df.loc[:, ['index', sia, sis, sin]].dropna().explode([sia, sis, sin]).fillna(0)

        # Force numeric types
        df[sin] = pd.to_numeric(df[sin], errors="coerce").fillna(0)
        df[sis] = pd.to_numeric(df[sis], errors="coerce").fillna(0)

        df[siavg] = [np.mean(np.abs(i)) for i in df[sia]]

        df[sisp] = [
            1 if n == 0 else (self.VcorrH0[int(min(self.MaxVcorrH0, n)) - 1, :] > s).sum() / self.VcorrH0.shape[1]
            for s, n in zip(df[sis].to_list(), df[sin].to_list())
        ]

        df.loc[df[sisp] == 0, sisp] = 1 / self.VcorrH0.shape[1]

        # Force numeric again
        df[siavg] = pd.to_numeric(df[siavg], errors="coerce").fillna(0)
        df[sisp] = pd.to_numeric(df[sisp], errors="coerce").fillna(1)

        # FORMULA
        df[siss] = np.sqrt(df[sin].astype(float)) * df[siavg] * (-np.log10(df[sisp]))

        self.df = pd.merge(
            self.df,
            df.groupby('index').agg(list).reset_index().loc[:, ['index', siavg, sisp, siss]],
            on='index',
            how='left'
        )
    
    def getScoreAdduct(self):
        '''
        Get score based on adduct
        ''' 

        df = self.df.loc[:, ['index', self.a, self.tpc]].dropna()
        df[self.tpc] = df[self.tpc].str.split(' // ')
        df = df.explode(self.tpc)
        dfl = list(zip(*[j for i,j in df.to_dict('list').items()]))

        dfl = [
            (index, adduct, lipid, self.L2An[lipid], self.L2A2i[lipid][adduct])
            for index, adduct, lipid in dfl if lipid in self.L and adduct in self.L2A[lipid]
        ]

        dfl = pd.DataFrame(
            dfl, columns=['index', self.a, self.tpc, self.s3An, self.s3Ai]
        )

        maxScore = 12
        minScore = 6

        dfl[self.s3s] = maxScore
        dfl.loc[dfl[self.s3An]>1, self.s3s] = -((maxScore-minScore)/(dfl.loc[dfl[self.s3An]>1, self.s3An]-1))*(dfl.loc[dfl[self.s3An]>1, self.s3Ai]-1) + maxScore


        df = pd.merge(
            df.loc[:, ['index', self.tpc]],
            dfl.loc[:, ['index', self.tpc, self.s3An, self.s3Ai, self.s3s]],
            on=['index', self.tpc],
            how='left'
        )
        df[self.s3s] = df[self.s3s].fillna(0)
        df = df.groupby('index').agg(list).reset_index()

        self.df = pd.merge(
            self.df,
            df.loc[:, ['index', self.s3An, self.s3Ai, self.s3s]],
            on='index',
            how='left'
        )


    def combineScores(self):
        '''
        Combine Max and Sum scores in molecular weight and lipid class
        '''

        logging.info("Combining scores based on maximum and addition of correlations")

        # Combine score based on molecular weight
        df = self.df.loc[:, ['index', self.s1ms, self.s1ss]].dropna().explode([self.s1ms, self.s1ss]).fillna(0)
        df[self.s1] = df[self.s1ms] + df[self.s1ss]

        self.df = pd.merge(
            self.df,
            df.groupby('index').agg(list).reset_index().loc[:, ['index', self.s1]],
            on='index',
            how='left'
        )

        # Combine scores from lipid class
        df = self.df.loc[:, ['index', self.s2ms, self.s2ss, self.s3s]].dropna()
        df = df.explode([self.s2ms, self.s2ss, self.s3s])
        df[self.s2] = df[self.s2ms].fillna(0)+df[self.s2ss].fillna(0)
        df[self.s2s3] = df[self.s2] + df[self.s3s]

        self.df = pd.merge(
            self.df,
            df.groupby('index').agg(list).reset_index().loc[:, ['index',self.s2, self.s2s3]],
            on='index',
            how='left'
        )

    def getMaximumScores(self, basedCol, score, argmaxp, argmaxs, argmax):
        '''
        Get maximum score and their corresponding lipid class (and molecular weight)
        '''

        logging.info("Identify group of annotations providing the maximum score")

        # Get maximum score
        df = self.df.loc[:, ['index', basedCol, score]].dropna()

        dfl = list(zip(*[
            j 
            for i,j in df.to_dict('list').items()
        ]))

        dfl = [(index, w.split(' // '), s, np.where(np.array(s) == s[np.argmax(np.array(s))])[0]) for index, w, s in dfl]

        dfl = pd.DataFrame([
            (index, ' // '.join([i for n,i in enumerate(w) if n in argmax]), s[argmax[0]], argmax.tolist()) 
            for index, w, s, argmax in dfl
        ], columns=['index', argmaxp, argmaxs, argmax])

        self.df = pd.merge(
            self.df,
            dfl,
            on='index',
            how='left'
        )


    def applyErrorPenalty(self):
        '''
        Apply error penalty anf get final tpmetrics
        '''
        
        logging.info("Calculate final score and apply error penalty")

        df = self.df.loc[:, ['index', self.e, self.s]].dropna().copy()

        df[self.e] = [max([float(j) for j in i.split(' // ')]) if type(i)==str else i for i in df[self.e].to_list()]

        B = 0.25 # Maximum percentage penalty
        Em = df[self.e].max() # Maximum error
        n = 2 # error penalty ~ error^n

        #FORMULA
        df[self.se] = (df[self.e]**n) * B / (Em**n)

        df[self.sfinal] = df[self.s] * (1 - df[self.se])

        self.df = pd.merge(
            self.df,
            df.loc[:, ['index', self.se, self.sfinal]],
            on='index',
            how='left'
        )
    
    def getRank(self):
        '''
        Rank annotations within a feature context considering TPMetrics
        '''
        
        df = self.df.loc[:, ['index', self.m, self.sfinal]].dropna()
        df['r'] = df[self.sfinal]+1 # avoid error with 0s score
        df['r'] = -df['r'] # invert rank
        df = df.groupby(self.m).agg(list).reset_index()
        df[self.rank] = [rankdata(i, method='dense').tolist() for i in df['r'].to_list()]
        df = df.loc[:, [self.m, 'index', self.rank]].explode(['index', self.rank])

        self.df = pd.merge(
            self.df,
            df,
            on=[self.m, 'index'],
            how='left'
        )
    
    def writeOutfile(self, df, outfile, finalCols):
        '''
        '''
        outpath = os.path.join(self.workdir, outfile)
        logging.info(f"Writing output file: {outpath}")
        df.to_csv(
            outpath,
            sep='\t', index=False, columns=finalCols
        )
    
    def getName2AdductColumn(self):
        '''
        Method to obtain a column: [(name1, AdductScore), (name2,AdductScore)...]
        '''

        df = self.df.loc[:, ['index', self.tpcL, self.tpc, self.s3s]].dropna()
        dfl = list(zip(*[j for i, j in df.to_dict('list').items()]))

        dfl = [(index, ['' if pd.isna(ii) else ii for ii in i], j.split(' // '), k, {'': 0}) for index,i,j,k in dfl]
        _ = [d.update({i:j for i,j in zip(tpc, s3s)}) for index,tpcL,tpc,s3s,d in dfl]

        self.df = pd.merge(
            self.df,
            pd.DataFrame(
                [[index, list(zip(tpcL, [d[i] for i in tpcL]))] for index, tpcL,tpc,s3s,d in dfl],
                columns=['index', self.tpcL_s3s]
            ),
            on='index',
            how='left'
        )

        #self.df[self.tpcL_s3s] = [[index, list(zip(tpcL, [d[i] for i in tpcL]))] for index, tpcL,tpc,s3s,d in dfl]

    #
    # Module 6: TableFilter
    #

    def TPFilter(self):
        '''
        Initialize TPFilter option
        '''

        self.outfileFilt = self.config['TPFilter']['outfile']
        self.dfFilt = None # dataframe filtered
        #self.finalColsFilt = [i for i in self.initCols if i not in [self.n]] + \
        #    [self.nFilt, self.tpc, self.s2argmaxp, self.s2m, self.s2mF, self.sfinal, self.rank] + self.i
        self.finalColsFilt = self.initCols + \
                    [self.tpc, self.s2argmaxp, self.s2m, self.s2mF, self.sfinal, self.rank] + self.cmmCol + self.i



    def filterTable(self):
        '''
        
        '''
        logging.info(f"Filtering table")

        self.dfFilt = self.df.loc[self.df[self.rank]==1, :].copy()

        # tpcL indicates the lipid class per name
        dfl = list(zip(*[j for i,j in self.dfFilt.loc[:, [self.n, self.tpidx, self.tpcL, self.s2argmaxp]].to_dict('list').items()]))

        dfl = [
            (
                np.array(nameL.split(' // ')), 
                np.array(tpidx.split(' // ')), 
                np.array(['' if pd.isna(i) else i for i in tpcL]), 
                [''] if pd.isna(maxpL) else maxpL.split(' // ')
            ) 
            for nameL, tpidx, tpcL, maxpL in dfl ]

        dfl = [
            zip(*[
                (nameL[n], tpidxL[n])
                for maxp in maxpL for n,boolean in enumerate(tpcL==maxp) if boolean
            ])
            for nameL, tpidxL, tpcL, maxpL in dfl
        ]

        self.dfFilt[self.n], self.dfFilt[self.tpidx] = zip(*[(' // '.join(i), ' // '.join(j)) for i,j in dfl])

    
    def getFilteredValues(self, pPTable):
        '''
        Extract from conserved columns of RowMerger the values corresponding
        to filtered annotations. We have to explode // and then explode ; to 
        get original annotation index. Then we merge and add the values.
        '''

        # Explode to original annotations
        idx2 = self.dfFilt.loc[:, ['index', self.tpidx]]
        idx2[self.tpidx] = idx2[self.tpidx].str.split(' // ')
        idx2 = idx2.explode(self.tpidx, ignore_index=True)
        idx2['ridx'] = idx2.index
        idx2[self.tpidx] = idx2[self.tpidx].str.split(' ; ')
        idx2 = idx2.explode(self.tpidx)
        idx2 = idx2.astype({self.tpidx: int})

        # Merge to include values of annotations
        idx2 = pd.merge(
            idx2,
            pPTable,
            how='left',
            on=self.tpidx
        )

        # Regroup to recover the rowmerger annotations with // and ; structure
        idx2 = idx2.fillna('')
        idx2 = idx2.astype({i: str for i in idx2.columns})

        idx2 = idx2.groupby(['index', 'ridx']).agg(list).reset_index().groupby('index').agg(list).reset_index()

        idx2 = idx2.to_dict('list')

        idx2 = {
            col: [
                re.sub(r'^(\s//\s)+$', '',
                ' // '.join([
                    ' ; '.join([ann for ann in set(rann) if ann!='']) for rann in row
                ])) for row in idx2[col]
            ] if col != 'index' else idx2[col]
            for col in idx2
        }

        idx2 = pd.DataFrame(idx2)

        # columns that will be replaced [excluding some...]
        cols = [i for i in idx2.columns if i not in ['index', self.n, self.a_original, self.e_original, self.w_original]]

        self.dfFilt = pd.merge(
            self.dfFilt.drop([i for i in self.dfFilt.columns if i in cols], axis=1).astype({'index': int}),
            idx2.loc[:, ['index', *cols]].astype({'index': int}),
            how='outer',
            on='index'
        )

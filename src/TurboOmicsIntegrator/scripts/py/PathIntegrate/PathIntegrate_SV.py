# Import libraries

import argparse
import pandas as pd
import numpy as np
import os
import json
import logging
import sys
import sspa
import pathintegrate

from modules.get_data import get_data

# Constants

omicDict = {
    'm': 'Metabolomics',
    'q': 'Proteomics',
    't': 'Transcriptomics'
    }

omicDict_inv = {
    'Metabolomics': 'm',
    'Proteomics': 'q',
    'Transcriptomics': 't'
    }

def filter_empty_omics(xi, omicDict):
    omics_data = {}
    for key, value in xi.items():
        if value.shape[1] == 0:
            logging.warning(f"Skipping empty omic: {key}")
        else:
            omics_data[omicDict[key]] = value
    return omics_data

# Main function

def main(args):

    #
    # Read working data
    #
    
    workingSamples, depVarList, xi, mo_paths, f2o = get_data(args)
    
    
    #
    # Apply PathIntegrate
    #
    
    logging.info('Creating PathIntegrate object')
    # drop empty omics before PathIntegrate
    omics_data = filter_empty_omics(xi, omicDict)
    if not omics_data:
        raise ValueError("All omics were empty after filtering. No data available for PathIntegrate.")
    pi_model = pathintegrate.PathIntegrate(
        omics_data=omics_data,
        metadata=depVarList,
        pathway_source= mo_paths,
        sspa_scoring=sspa.sspa_SVD,
        min_coverage=4
    )
    
    # Single View
    
    logging.info('Creating Single View model')
    # We have changed the label of the View, but the code still uses the old name
    model = pi_model.MultiView(ncomp=args['n_components'])
    
    #
    # Extract information
    #
    
    # Get R2 (explained variance in Y) and pvalues
    from scipy import stats
    
    logging.info('Calculating Latent Variable information')
    model_info = {'LV':[], 'model':{}}
    for i in range(args['n_components']):
        pearsonRes = stats.pearsonr(model.Ts_[:, i], depVarList)
        model_info['LV'].append({
          'LV': i+1, 
          'R2': pearsonRes.statistic**2,
          'omic_weight': dict(zip(model.omics_names, model.A_corrected_[:,i].tolist())),
          'pv': pearsonRes.pvalue
          })
        
    from sklearn.metrics import r2_score
    model_info['model']['R2'] = r2_score(
        depVarList, model.predict(list(pi_model.sspa_scores_mv.values()))
        )
    
    # Get projections
    projections = [
        {'sample': sample, 'proj': i.tolist()} 
        for sample, i in zip(workingSamples, model.Ts_)
        ]
    
    
    # Get pathway information
    vip_info = model.vip.sort_values(by='VIP', ascending=False)
    vip_info = dict(list(vip_info.groupby('Source')))
    
    pathInfo = {}
    
    for i in vip_info:
    #i = 'Metabolomics'
        vip_info[i]['Path_ID'] = vip_info[i].index
        pathInfo[i] = vip_info[i].drop([0, 'Source'], axis=1).T.to_dict()
    
    for i in model.molecular_importance:
        #i = 'Metabolomics'
    
        for j in model.molecular_importance[i]:
            #j = 'R-HSA-112310'
    
            _df = model.molecular_importance[i][j]\
                .sort_values('PC1_Loadings', ascending=False).copy()
    
            _df['fid'] = _df.index
            _df['omic'] = omicDict_inv[i]
    
            pathInfo[i][j]['molecular_importance'] = list(_df.T.to_dict().values())
            
    # End #
    
    #
    # Write model information
    #
    
    logging.info('Writing PathIntegrate results')
    with open(os.path.join(args['output'], 'model_info.json'), 'w') as f:
        json.dump(model_info, f)
    
    with open(os.path.join(args['output'], 'projections.json'), 'w') as f:
        json.dump(projections, f)
    
    with open(os.path.join(args['output'], 'path_info.json'), 'w') as f:
        json.dump(pathInfo, f)
    
    
    #
    # Calculate empirical p-value (for R2)
    #
    
    logging.info('Calculate empirical p-values')
    pvalue_info = {}
    
    # Get null distribution
    r2H0= []
    r = 10
    
    np.random.seed(seed=0)
    for i in range(r):
        logging.info(f'Permutation {i+1}')
        xi_i = {}
        for key, value in xi.items():
            depVarList_i = np.array(depVarList).copy()
            np.random.shuffle((depVarList_i))
            
            _x = value.copy()
            #[np.random.shuffle(i) for i in _x.T.to_numpy()]
            xi_i[key] = _x
    
        # drop empty omics before PathIntegrate
        omics_data_i = filter_empty_omics(xi_i, omicDict)
        if len(omics_data_i) == 0:
            logging.warning("All omics empty in permutation — skipping")
            continue
        pi_model_i = pathintegrate.PathIntegrate(
            omics_data=omics_data_i,
            metadata= depVarList_i,
            pathway_source= mo_paths,
            sspa_scoring=sspa.sspa_SVD,
            min_coverage=4
        )
    
        model_i = pi_model_i.MultiView()
        
        r2H0.append(r2_score(
            depVarList_i, 
            model_i.predict(list(pi_model_i.sspa_scores_mv.values()))
            ))
        
        
    # Calculate p-value
    pvalue_info['R2pv'] = max(1,sum(np.array(r2H0)>=model_info['model']['R2']))/len(r2H0)
    pvalue_info['R2H0'] = r2H0
    
    # Write pvalue_info
    with open(os.path.join(args['output'], 'pvalue_info.json'), 'w') as f:
        json.dump(pvalue_info, f)
    
    return

if __name__ == '__main__': 
    
    parser = argparse.ArgumentParser(
        description='PathIntegrate_SV.py')
    
    parser.add_argument('--params', type=str, help='Path to json file with parameters')

    args = parser.parse_args()
    
    with open(args.params, 'r') as f:
        params = json.load(f)
    
    logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(stream=sys.stdout)
        ]
    )
    
    logging.info('Start PathIntegrate_SV.py')
    try:
        main(params)
    except ValueError as e:
        # Expected errors. Clean message only
        print(str(e), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print("Unexpected internal error occurred.", file=sys.stderr)
        sys.exit(2)
    logging.info('End script')
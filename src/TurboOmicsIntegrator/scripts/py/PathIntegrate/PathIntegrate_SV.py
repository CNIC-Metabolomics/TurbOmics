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

# Local functions

def vip_efficient(model):
    #https://github.com/scikit-learn/scikit-learn/issues/7050
    t = model.x_scores_
    w = model.x_rotations_ # replace with x_rotations_ if needed
    q = model.y_loadings_ 
    features_, _ = w.shape
    vip = np.zeros(shape=(features_,))
    inner_sum = np.diag(t.T @ t @ q.T @ q)
    SS_total = np.sum(inner_sum)
    vip = np.sqrt(features_*(w**2 @ inner_sum)/ SS_total)
    return vip

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
    pi_model = pathintegrate.PathIntegrate(
        omics_data={omicDict[key]: value for key, value in xi.items()},
        metadata=depVarList,
        pathway_source= mo_paths,
        sspa_scoring=sspa.sspa_SVD,
        min_coverage=4
    )
    
    # Single View
    from sklearn.cross_decomposition import PLSRegression
    
    logging.info('Creating Single View model')
    model = pi_model.SingleView(
        model=PLSRegression,
        model_params={'max_iter':500, 'n_components': args['n_components']})
    
    #
    # Extract information
    #
    
    # Get R2 (explained variance in Y) and pvalues
    from scipy import stats
    
    logging.info('Calculating Latent Variable information')
    model_info = {'LV':[], 'model':{}}
    for i in range(args['n_components']):
        pearsonRes = stats.pearsonr(model.x_scores_[:, i], depVarList)
        model_info['LV'].append({
          'LV': i+1, 
          'R2': pearsonRes.statistic**2,
          'pv': pearsonRes.pvalue
          })
        
    from sklearn.metrics import r2_score
    model_info['model']['R2'] = r2_score(
        depVarList, model.predict(pi_model.sspa_scores_sv)
        )
    
    # Get projections
    projections = [
        {'sample': sample, 'proj': i.tolist()} 
        for sample, i in zip(workingSamples, model.x_scores_)
        ]
    
    # Get pathway information
    pathInfo = []
    for f,c in zip(model.feature_names_in_, vip_efficient(model).tolist()):
        _df = model.molecular_importance[f]\
            .sort_values('PC1_Loadings', ascending=False).copy()
        _df['fid'] = _df.index
        _df['omic'] = [f2o[i] for i in _df.index]
        pathInfo.append({
            'Path_ID': f,
            'Name': mo_paths.Pathway_name[f],
            'VIP': c,
            'molecular_importance': list(_df.T.to_dict().values())
        })
    
    
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
    
        pi_model_i = pathintegrate.PathIntegrate(
            omics_data={omicDict[key]: value for key, value in xi_i.items()},
            metadata= depVarList_i,
            pathway_source= mo_paths,
            sspa_scoring=sspa.sspa_SVD,
            min_coverage=4
        )
    
        model_i = pi_model_i.SingleView(
            model=PLSRegression,
            model_params={'max_iter':500, 'n_components': args['n_components']})
        
        r2H0.append(r2_score(
            depVarList_i, 
            model_i.predict(pi_model_i.sspa_scores_sv)
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
    main(params)
    logging.info('End script')
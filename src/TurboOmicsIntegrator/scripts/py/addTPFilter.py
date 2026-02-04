import argparse
import numpy as np
import pandas as pd
import logging
import sys

# Constants
COLUMNS = [
    'TP_Name', 
    'TP_Adduct', 
    'TP_mz Error (ppm)', 
    'TP_Class', 
    'TP_TPMetrics'
]

# Main
def main(args):
    
    tpf = [
        pd.read_csv(i, sep='\t', low_memory=False, index_col=0) 
        for i in args.tpfilter
    ]

    m2i = pd.read_json(args.m2i)
    m2i = m2i.set_index(m2i.columns[0])

    for i in range(len(tpf)):
        # Exclude non-generated-TP columns and quantification
        tpf[i] = tpf[i].iloc[:, m2i.shape[1]:]
        tpf[i] = tpf[i][[col for col in tpf[i].columns if '_quant_' not in col]]
        
        # Add prefix to TP columns
        tpf[i].columns = [
            f'TP_{col}' if 'TP_' not in col else col 
            for col in tpf[i]
        ]

        tpf[i]['_id'] = tpf[i].index
        tpf[i] = tpf[i].fillna('')
        tpf[i] = tpf[i].groupby('_id').agg(lambda x: ' & '.join([str(n) for n in x.tolist()]))
    
    # Merge with m2i
    # m2itp = m2i.join(pd.concat(tpf)).fillna('').reset_index().replace('', np.nan)

    # Write new m2i
    # m2itp[[m2itp.columns[0]]+m2i.columns.tolist()+COLUMNS].to_json(args.m2i, orient='records')

    # Add a suffix to the NEW TPFilter columns
    tp_concat = pd.concat(tpf)
    m2itp = (
        m2i.join(tp_concat, how='left', rsuffix='_TPF')
        .fillna('')
        .reset_index()
        .replace('', np.nan)
    )

    # Build column list without duplicates, preserving order
    base_cols = [m2itp.columns[0]] + m2i.columns.tolist()
    final_cols = list(dict.fromkeys(base_cols + COLUMNS))  # removes duplicates safely

    m2itp[final_cols].to_json(args.m2i, orient='records')

    # Write full m2i
    m2itp.to_json(args.m2itp, orient='records')

    return 0

# Entry Point
if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="""
        Prepare folder for TurboPutative execution. 
        Exec example: 
            python addTPFilter.py 
    """)

    parser.add_argument("--tpfilter", action='append', help="Paths to 4_TPFilter.tsv")
    parser.add_argument("--m2i", help="Path to m2i.json")
    parser.add_argument("--m2itp", help="Path to m2iTP.json")

    args = parser.parse_args()

    #logFile=f'{os.path.dirname(args.infile)}/preprocessing.log'
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(stream=sys.stdout),
            #logging.FileHandler(logFile)
        ]
    )

    logging.info('Start main')
    main(args)
    logging.info('End')
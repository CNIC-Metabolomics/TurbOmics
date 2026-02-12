cat('** Start script: myGSEA.R\n')

# Constants
DATE_DB <- "202311"

# Get command line arguments
args = commandArgs(trailingOnly = TRUE)

basePath    <- args[1]
workingPath <- args[2]
org         <- args[3]

# Libraries
library(fgsea)
library(reactome.db)
library(jsonlite)


# -----------------------------
# Load data
# -----------------------------

cat('**\n')
cat("** Working Path: ", workingPath, "\n")
cat('**\n')

df <- as.data.frame(fromJSON(
  paste0(workingPath, '/EID_GN_RankStat.json')
))


# -----------------------------
# Prepare GENE SYMBOL ranking
# -----------------------------

# Uppercase
df$GeneName <- toupper(df$GeneName)

# Remove NA
df_gene <- df[!is.na(df$GeneName), ]

# Collapse duplicates (max abs value)
df_gene_unique <- aggregate(
  RankStat ~ GeneName,
  data = df_gene,
  FUN = function(x) x[which.max(abs(x))]
)

# Sort
df_gene_unique <- df_gene_unique[
  order(df_gene_unique$RankStat, decreasing = TRUE),
]

# Create ranked vector
rankStat_gene <- df_gene_unique$RankStat
names(rankStat_gene) <- df_gene_unique$GeneName


# Safety check
stopifnot(!any(duplicated(names(rankStat_gene))))


# -----------------------------
# Prepare ENTREZ ranking (Reactome)
# -----------------------------

df$EntrezGene <- as.character(df$EntrezGene)

df_entrez <- df[!is.na(df$EntrezGene), ]

df_entrez_unique <- aggregate(
  RankStat ~ EntrezGene,
  data = df_entrez,
  FUN = function(x) x[which.max(abs(x))]
)

df_entrez_unique <- df_entrez_unique[
  order(df_entrez_unique$RankStat, decreasing = TRUE),
]

rankStat_entrez <- df_entrez_unique$RankStat
names(rankStat_entrez) <- df_entrez_unique$EntrezGene


stopifnot(!any(duplicated(names(rankStat_entrez))))


# -----------------------------
# HALLMARK
# -----------------------------

cat('** Perform enrichment with HALLMARK\n')

rankStat <- rankStat_gene

pathways <- gmtPathways(
  paste0(basePath, "/mydb/", DATE_DB,
         "/Homo_sapiens/h.all.v2023.2.Hs.symbols.gmt")
)

fgseaRes <- fgsea(pathways, rankStat, maxSize = 500, minSize = 5)

out <- fgseaRes[fgseaRes$pval < 0.1]
out <- out[order(out$pval)]

writeLines(
  toJSON(out),
  paste0(workingPath, "/HALLMARK_GSEA.json")
)


# -----------------------------
# GO:MF
# -----------------------------

cat('** Perform enrichment with GO:MF\n')

rankStat <- rankStat_gene

pathways <- gmtPathways(
  paste0(basePath, "/mydb/", DATE_DB,
         "/Homo_sapiens/c5.go.mf.v2023.2.Hs.symbols.gmt")
)

fgseaRes <- fgsea(pathways, rankStat, maxSize = 500, minSize = 5)

out <- fgseaRes[fgseaRes$padj < 0.1]
out <- out[order(out$pval)]

writeLines(
  toJSON(out),
  paste0(workingPath, "/GO_MF_GSEA.json")
)


# -----------------------------
# GO:CC
# -----------------------------

cat('** Perform enrichment with GO:CC\n')

rankStat <- rankStat_gene

pathways <- gmtPathways(
  paste0(basePath, "/mydb/", DATE_DB,
         "/Homo_sapiens/c5.go.cc.v2023.2.Hs.symbols.gmt")
)

fgseaRes <- fgsea(pathways, rankStat, maxSize = 500, minSize = 5)

out <- fgseaRes[fgseaRes$padj < 0.1]
out <- out[order(out$pval)]

writeLines(
  toJSON(out),
  paste0(workingPath, "/GO_CC_GSEA.json")
)


# -----------------------------
# GO:BP
# -----------------------------

cat('** Perform enrichment with BP\n')

rankStat <- rankStat_gene

pathways <- gmtPathways(
  paste0(basePath, "/mydb/", DATE_DB,
         "/Homo_sapiens/c5.go.bp.v2023.2.Hs.symbols.gmt")
)

fgseaRes <- fgsea(pathways, rankStat, maxSize = 500, minSize = 5)

out <- fgseaRes[fgseaRes$padj < 0.1]
out <- out[order(out$pval)]

writeLines(
  toJSON(out),
  paste0(workingPath, "/GO_BP_GSEA.json")
)


# -----------------------------
# Reactome
# -----------------------------

cat('** Perform enrichment with Reactome\n')

rankStat <- rankStat_entrez

pathways <- reactomePathways(names(rankStat))

fgseaRes <- fgsea(pathways, rankStat, maxSize = 500, minSize = 5)

out <- fgseaRes[fgseaRes$padj < 0.1]
out <- out[order(out$pval)]

writeLines(
  toJSON(out),
  paste0(workingPath, "/REACTOME_GSEA.json")
)


# -----------------------------
# KEGG
# -----------------------------

cat("** Perform enrichment with KEGG\n")

rankStat <- rankStat_gene

pathways <- gmtPathways(
  paste0(basePath, "/mydb/", DATE_DB, "/", org, "/kegg.gmt")
)

fgseaRes <- fgsea(pathways, rankStat, maxSize = 500, minSize = 5)

out <- fgseaRes[fgseaRes$padj < 0.1]
out <- out[order(out$pval)]

writeLines(
  toJSON(out),
  paste0(workingPath, "/KEGG_GSEA.json")
)


cat('** End script\n')

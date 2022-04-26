from cmath import inf
import re    
# raw = ' Some text\n\nABSTRACT\nExtract \nthis text\nAbstract: \nFunny \n\nOther text'
# pattern = 'abstract:|abstract'


with open('src/posters-test.txt', 'r') as infile:
    raw = infile.read()

# abstract = re.split(pattern ,raw, flags=re.IGNORECASE)[2].split("\n\n")[0]
title_pattern = 'title:'
abstracts = re.split(title_pattern, raw, flags=re.IGNORECASE)[1:]
print(len(abstracts))

abstract_pattern = 'abstract:'

for abstract in abstracts:
    parts = re.split(abstract_pattern, abstracts, flags=re.IGNORECASE)


print(abstracts)
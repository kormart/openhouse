import re    

# prototype:
# raw = ' Some text\n\nABSTRACT\nExtract \nthis text\nAbstract: \nFunny \n\nOther text'
# pattern = 'abstract:|abstract'
# abstract = re.split(pattern ,raw, flags=re.IGNORECASE)[2].split("\n\n")[0]

result = []

with open('src/posters.txt', 'r') as infile:
    raw = infile.read()

title_pattern = 'title:'
abstracts = re.split(title_pattern, raw, flags=re.IGNORECASE)[1:]
# print(len(abstracts))

for i,abstract in enumerate(abstracts):
    split_abstract = re.split('abstract:', abstract, flags=re.IGNORECASE)
    title = split_abstract[0].strip()
    split_links = re.split('link:|links:', split_abstract[1], flags=re.IGNORECASE)
    abstract_text = split_links[0].strip()
    split_contact = re.split('contact:|contacts:|contact person:|contact persons:', split_links[1], flags=re.IGNORECASE)
    links = split_contact[0].strip()
    split_links = re.split('unit:', split_contact[1], flags=re.IGNORECASE)
    contact = split_links[0].strip()
    split_tags = re.split('tags:', split_links[1], flags=re.IGNORECASE)
    split_teams = re.split('teams:', split_tags[1], flags=re.IGNORECASE)
    tags = split_teams[0].split(',')
    tags = list(map( lambda tag: tag.strip(), tags))
    teams = split_teams[1].strip()
    if teams == '':
        teams = 'common_team_link'

    # print(i,title,end=' ')
    result.append({"title": title, "text": abstract_text, "links": links, "presenter": contact, "tags": tags, "teams": teams})


print('export default {posters: ', result, '}')
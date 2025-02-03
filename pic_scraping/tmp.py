
import json
import requests

headers = {
    "Cookie": input("Paste your cookie here: "),
}

f = open("pic_scraping/count.txt", "r")
count = int(f.read())
f.close()

nextPage = f"https://www.courses.miami.edu/learn/api/v1/users?offset={count}"

while nextPage != "":
    print(count)
    r = requests.get(nextPage, headers=headers)
    
    if r.status_code != 200:
        print("Error: ", r.status_code)
        break
    
    users = r.json()['results']
    
    for user in users:
        if "default_profile_avatar" not in user['avatar']['permanentUrl']:
            userInfo = f"{user['givenName']}|{user['familyName']}|{user['avatar']['permanentUrl']},"
            f = open("pic_scraping/output.txt", "a")
            f.write(userInfo)
            
            avatarImage = requests.get(user['avatar']['permanentUrl'], headers=headers)
            with open(f"pic_scraping/avatars/{user['givenName']}_{user['familyName']}_{user['id']}.jpg", "wb") as out_file:
                out_file.write(avatarImage.content)
            
    nextPage = r.json()['paging']['nextPage']
    
    f = open("pic_scraping/count.txt", "w")
    f.write(str(count + 100))
    f.close()
    
    count += 100


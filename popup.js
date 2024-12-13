

// change current course name
let currentUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    function extractCourseName() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        func: function() {
                            if (window.location.href.includes("outline")) {
                                try {
                                    const iframe = document.querySelector("div.panel-content > iframe");
                                    if (iframe && iframe.contentDocument) {
                                        const courseNameElement = iframe.contentDocument.querySelector("#crumb_1");
                                        if (courseNameElement) {
                                            const fullName = courseNameElement.innerText;
                                            return fullName.split("-")[1].trim();
                                        }
                                    }
                                } catch (error) {
                                    console.error("Error extracting course name:", error);
                                }
                            }
                            return "NONE";
                        }
                    },
                    (results) => {
                        if (results && results[0] && results[0].result) {
                            const courseName = results[0].result;
                            document.querySelector("#current-course").textContent = courseName;
                            
                            chrome.storage.local.set({ currentCourseName: courseName });
                        }
                    }
                );
            }
        });
    }

    chrome.storage.local.get('currentCourseName', (result) => {
        const storedCourseName = result.currentCourseName || "NONE";
        document.querySelector("#current-course").textContent = storedCourseName;
    });

    extractCourseName();
});

// function for getting todays schedule
document.querySelector("#schedule-btn").addEventListener("click", async () => {

    if (document.querySelector("#schedule-btn").innerText == "Hide Schedule") {
        document.querySelector("#schedule-btn").innerText = "Get Today's Schedule"

        flattenBox()

        setTimeout(() => {
            document.querySelector("#schedule").remove();
        }, 500);

        return
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const url = new URL(tab.url);
    const domain = url.hostname;

    const response = await new Promise((resolve, reject) => {
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];

        chrome.runtime.sendMessage(
            // { action: "fetchData", url: `https://canelink.miami.edu/psc/UMIACP1D/EMPLOYEE/SA/s/WEBLIB_HCX_EN.H_SCHEDULE.FieldFormula.IScript_ScheduleByInterval?from=${formattedDate}&thru=${formattedDate}` },
            { action: "fetchData", url: `https://canelink.miami.edu/psc/UMIACP1D/EMPLOYEE/SA/s/WEBLIB_HCX_EN.H_SCHEDULE.FieldFormula.IScript_ScheduleByInterval?from=2024-10-21&thru=2024-10-21` },
            (response) => {
                if (response.success) {
                    resolve(response.response);
                } else {
                    reject(response.error);
                }
            }
        );
    });

    currentDate = new Date();
    dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    convertDay = {
        "Monday": "mon",
        "Tuesday": "tues",
        "Wednesday": "wed",
        "Thursday": "thurs",
        "Friday": "fri",
        "Saturday": "sat",
        "Sunday": "sun"
    }

    // day = convertDay[dayOfWeek];
    day = "mon"

    classes = response['class_schedule']

    schedule = {}

    for (lecture of classes) {
        if (lecture[day] == "Y") {
            schedule[lecture['subject'] + lecture['catalog_nbr'] + " | " + lecture['class_descr'] + " (" + lecture['component'] + ")"] = {
                "start": lecture['meeting_time_start'],
                "end": lecture['meeting_time_end'],
                "location": lecture['facility_descr']
            }
        }
    }


    const sortedSchedule = Object.entries(schedule).sort((a, b) => {
        const startTimeA = convertTimeToMinutes(a[1].start);
        const startTimeB = convertTimeToMinutes(b[1].start);
        return startTimeA - startTimeB;
    });

    function convertTimeToMinutes(time) {
        const [hour, minute] = time.split('.');
        return parseInt(hour) * 60 + parseInt(minute);
    }
  
    function formatTime(time) {
        const [hour, minute] = time.split('.');
        let hours = parseInt(hour);
        let period = "AM";

        if (hours >= 12) {
            period = "PM";
            if (hours > 12) {
            hours -= 12;
            }
        } else if (hours === 0) {
            hours = 12;
        }

        return `${hours}:${minute} ${period}`;
    }

    today = new Date();
    formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;

    scheduleBox = document.createElement("div")
    scheduleBox.id = "schedule"
    document.querySelector(".output-box").appendChild(scheduleBox)

    p = document.createElement("p")
    p.id = "schedule-info"
    p.innerHTML = `<h3>${dayOfWeek}'s Schedule (${formattedDate}):</h3>`
    document.querySelector("#schedule").appendChild(p)
    adjustBoxHeight(p)

    sortedSchedule.forEach(([className, classDetails]) => {
        const classElement = document.createElement('div');
        classElement.classList.add('class-item');
  
        const startTime = formatTime(classDetails.start);
        const endTime = formatTime(classDetails.end);
  
        classElement.innerHTML = `
          <div class="class-name">${className}</div>
          <div class="class-details">
            <strong>Time:</strong> ${startTime} - ${endTime}<br>
            <strong>Location:</strong> ${classDetails.location}
          </div>
        `;
        
        document.querySelector("#schedule").appendChild(classElement);
        adjustBoxHeight(classElement);
    });

    document.querySelector("#schedule-btn").innerText = "Hide Schedule";
});

// function for downloading all course documents
document.querySelector('#download-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript(
        {
            target: { tabId: tab.id },
            func: getLinks
        },
        async (results) => {
            const fileLinks = results[0].result

            if (fileLinks.length === 0) {
                document.querySelector("#status").innerHTML = "<p class='log'>No files found!</p>"

                setTimeout(() => {
                    setTimeout(() => {
                        document.querySelector(".log").classList.add("fade-out-swipe");
            
                        setTimeout(() => {
                            document.querySelector(".log").style.display = "none";
                        }, 450);
                    }, 350);
                }, 1600);

                return
            }
            
            fileLinks.forEach(url => {
                chrome.downloads.download({ url })
            })

            document.querySelector("#status").innerHTML = "<p class='log'>Downloaded all files!</p>"

            setTimeout(() => {
                setTimeout(() => {
                    document.querySelector(".log").classList.add("fade-out-swipe");
        
                    setTimeout(() => {
                        document.querySelector(".log").style.display = "none";
                    }, 450);
                }, 350);
            }, 1600);
        }
    )
})

// function for downloading all submissions
document.querySelector("#submission-btn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const url = new URL(tab.url);
    const domain = url.hostname;

    chrome.cookies.getAll({ domain }, async (cookies) => {
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
        course_id = tab.url.split("/")[5]

        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        }

        gradebook = await fetch(`https://www.courses.miami.edu/learn/api/public/v1/courses/${course_id}/gradebook/columns`, {headers: headers})
        gradebook = await gradebook.json()
        gradebook = gradebook['results']

        for (column of gradebook) {
            if (column['name'] != "Weighted Total" && column['name'] != "Total") {
                saved_file_name = column['name']
                document.querySelector("#status").innerHTML += `<p class='log'>Downloading ${saved_file_name}...</p>`
                adjustBoxHeight(document.querySelector("p.log"))

                attempts = await fetch(`https://www.courses.miami.edu/learn/api/public/v1/courses/${course_id}/gradebook/columns/${column['id']}/attempts`, {headers: headers})
                attempts = await attempts.json()
                attempts = attempts['results']

                if (attempts.length == 0) {
                    continue
                }
                
                attempt_id = attempts[0]['id']

                file = await fetch(`https://www.courses.miami.edu/learn/api/public/v1/courses/${course_id}/gradebook/attempts/${attempt_id}/files`, {headers: headers})
                file = await file.json()
                file = file['results']

                if (file.length != 0) {
                    file = file[0]
                    file_id = file['id']
                    file_name = file['name']
                    file_extension = file_name.split(".").at(-1)

                    try {
                        console.log("Downloading: ", `https://www.courses.miami.edu/webapps/assignment/download?course_id=${course_id}&attempt_id=${attempt_id}&file_id=${file_id}&fileName=${file_name}`)
                        download = await fetch(encodeURI(`https://www.courses.miami.edu/webapps/assignment/download?course_id=${course_id}&attempt_id=${attempt_id}&file_id=${file_id}&fileName=${file_name}`, {headers: headers}))
                        blob = await download.blob()

                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = downloadUrl;
                        a.download = `${saved_file_name}.${file_extension}`;
                        a.click();
                        URL.revokeObjectURL(downloadUrl);
                    }
                    catch (error) {
                        console.error(error)
                    }
                }
            }
        }

        // fade out rest of stuff
        setTimeout(() => {
            const paragraphs = document.querySelectorAll(".log");
    
            paragraphs.forEach((p, index) => {
                setTimeout(() => {
                    p.classList.add("fade-out-swipe");
        
                    setTimeout(() => {
                        p.style.display = "none";
                    }, 450);
                }, index * 350);
            });
        }, 1600);

    });
})

// placeholder
// document.querySelector("#cookie-btn").addEventListener("click", async () => {
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

//     const url = new URL(tab.url);
//     const domain = url.hostname;

//     chrome.cookies.getAll({ domain }, async (cookies) => {
//         const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");

//         headers = {
//             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
//             'Cookie': cookieString,
//             'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
//         }

//         response = await fetch('https://www.courses.miami.edu/learn/api/v1/users/me', {headers: headers})
//         response = await response.json()

//         console.log(response)

//     });
// });


// get all students from class
document.querySelector("#students-btn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const url = new URL(tab.url);
    const domain = url.hostname;

    if (document.querySelector("#students-btn").innerText == "Hide Students From Class") {
        p = document.querySelector("#students")

        setTimeout(() => {
            p.classList.remove("fade-in");
            p.classList.add("fade-out");
          
            flattenBox()

            setTimeout(() => {
                p.remove();
            }, 500);

          }, 500);

        document.querySelector("#students-btn").innerText = "Get Students From Class"
        return
    }

    chrome.cookies.getAll({ domain }, (cookies) => {
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
        course_id = tab.url.split("/")[5]

        fetch(`https://www.courses.miami.edu/learn/api/public/v1/courses/${course_id}/users?expand=user`, {
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Cookie': cookieString,
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            }
        }).then(response => {
            return response.json();
        })
        .then(data => {
            people = {"instructor": [], "grader": [], "students": []}
            lst = data.results
            lst.forEach(person => {
                person_name = person['user']['name']['given'] + " " + person['user']['name']['family']
                if (person['courseRoleId'] == "Instructor") {
                    people["instructor"].push(person_name)
                }
                else if (person['courseRoleId'] == "Grader") {
                    people["grader"].push(person_name)
                }
                else {
                    people["students"].push(person_name)
                }
            })

            window.people = people

            message = ""
            if (people.instructor.length > 0) {
                message += `<h3>Instructor:</h3>${people.instructor.map(element => `<li>${element}</li>`)}`;
            }
            
            if (people.grader.length > 0) {
                message += `<h3>Grader:</h3>${people.grader.map(element => `<li>${element}</li>`)}`;
            }
            
            if (people.students.length > 0) {
                message += `<h3>Students:</h3>${people.students.map(element => `<li>${element}</li>`).join("")}`;
            }

            p = document.createElement("p")
            p.id = "students"
            p.innerHTML = message
            document.querySelector(".output-box").appendChild(p)
            adjustBoxHeight(p)

            setTimeout(() => {
                p.classList.add("fade-in");
            }, 200);

            document.querySelector("#students-btn").innerText = "Hide Students From Class"

        })
        .catch(error => {
            console.error(error);
        });
    });
});


// gets all link that have bbcswebdav in them
function getLinks() {
    files = []
    
    iframes = Array.from(document.querySelectorAll('iframe'))
    
    iframes.forEach(iframe => {
        if (iframe.contentDocument) {
            links = Array.from(iframe.contentDocument.querySelectorAll('a[href]'))
            links.forEach(link => {
                href = link.href
                if (href.includes("bbcswebdav")) {
                    files.push(href)
                }
            })
        }
    })

    return files
}


// just for css transitions
function adjustBoxHeight(tag) {
    if (isNaN(parseFloat(document.querySelector(".output-box").style.maxHeight))) {
        height = tag.scrollHeight + 100;
    }
    else {
        height = parseFloat(document.querySelector(".output-box").style.maxHeight) + tag.scrollHeight + 100;
    }
    document.querySelector(".output-box").style.maxHeight = `${height}px`;
}

function flattenBox() {
    document.querySelector(".output-box").style.maxHeight = "10px";
    document.querySelector(".output-box").style = "";
}



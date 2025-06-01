let storage = {};
/// Function is called when the angular slider's... uhm... angle is changed.
function onAngleChange(angle) {
    console.log(`Angle changed to: ${angle}`);
    // fetch(`http://localhost:3000/${angle}`);
    updateState(9, angle);
}

// All sliders and buttons
// link1 = document.querySelector("#basepitch");
link2 = document.querySelector("#arm1pitch");
link3 = document.querySelector("#arm2pitch");

efpitch = document.querySelector("#efpitch");
// efyaw = document.querySelector("#efyaw");
efroll = document.querySelector("#efroll");

// attach event listeners to all sliders so they update the state of the arm at the backend when changed.
[link2, link3,
    efpitch, efroll].forEach(elem => {
        let id = elem.getAttribute("data-id");
        elem.addEventListener('input', () => {
            updateState(id, elem.value);
            // show(message);
        })
    })

const SERVICE_DOMAIN = "";
// const SERVICE_DOMAIN = "https://francisco49999.pythonanywhere.com"

// Do same for the buttons
let gripped = true;
button1 = document.getElementById('gripper');
// button2 = document.querySelector('.cbtn2');

button1.addEventListener('click', function () {
    if (gripped) {
        button1.textContent = "Grip";
        gripped = false;
        updateState(7, 1);
        if (button1.classList.contains("released")) {
            button1.classList.remove("released");
            button1.classList.add("gripped");
        }
    } else {
        button1.textContent = "Release";
        gripped = true;
        updateState(8, 1);
        if (button1.classList.contains("gripped")) {
            button1.classList.remove("gripped");
            button1.classList.add("released");
        }
    }

})


let restBtn = document.querySelector('.rest-btn');
restBtn.addEventListener('click', function () {
    updateState(12, 1);
    show("Arm is now resting");
}
)


const gainAccessDiv = document.querySelector('#getaccess');

function requestAccess() {
    response = fetch(`${SERVICE_DOMAIN}/get-access`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'X-CSRF-Token': 'balabluebalablue'
        },
        // body: JSON.stringify({"test": ""}),

    })
    response.then((res) => {
        if (res.ok) return res.json();
        else {
            show('Arm cannot be accessed at the moment. Things might have gotten out of hand.');
        }
    })
    .then(token => {
        console.log(token)
        if (token["access_token"]) {
            console.log(token);
            console.log(token['access_token']);
            storage['access-token'] = token['access_token'];
            show("Access Granted!");
            gainAccessDiv.style.display = "none";
        }
        else {
            show('Access Denied. Try again later.');
        }
        })
}

function insertClass(name, dest) {
    document.querySelector(dest).classList.add(name);
}
function removeClass(name, dest) {
    document.querySelector(dest).classList.remove(name);
    
}

async function checkAccess() {
    const accessToken = storage['access-token'];
    let hasAccess = false;

    if (accessToken) {
        try {
            const response = await fetch(`${SERVICE_DOMAIN}/check-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 'access-token': accessToken }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data['status'] === 'authorized') {
                console.log("Access granted");
                hasAccess = true;
            } else {
                storage["access-token"] = null;
            }
        } catch (error) {
            console.error("Error checking access:", error);
        }
    }

    // return hasAccess;
    // gainAccessDiv.style.display = hasAccess ? 'none' : 'block';
    if (!hasAccess) {
        show("User currently has no access. Please click the button above to request");
        insertClass("denied", ".notification-text");
        removeClass("access", ".notification-text");
        insertClass("access-denied", ".notification-text");
        removeClass("access-granted", ".notification-text");
    }
    else {
        show("This user currently has access");
        insertClass("access", ".notification-text");
        removeClass("denied", ".notification-text");
        insertClass("access-granted", ".notification-text");
        removeClass("access-denied", ".notification-text");
    }
    return hasAccess;
}

accReqButton = document.getElementById("acc-req");
accReqButton.addEventListener('click', (e) => requestAccess())


document.addEventListener('DOMContentLoaded', function (ev) {
    checkAccess();
})

window.onload = () => checkAccess();

setInterval(checkAccess, 1000 * 60 * 1); //Check every 1 minute

function show(message) {
    document.querySelector(".notification-text").textContent = message; JsonDocument
    // document.getElementById("modalOverlay").classList.add("show");
}

// function hide() {
//     document.getElementById("modalOverlay").classList.remove("show");
// }

function updateState(dataID, value) {
    let updateParams =
    {
        'id': `${dataID}`,
        'value': `${value}`,
        'access-token': storage['access-token'],
    };

    // if (!checkAccess()) al}ert("You currently don't have access");}
    // When any changes is made, the frontend must first check if this user still has access to the controls.
    if (!checkAccess()) return;

    request = fetch(`${SERVICE_DOMAIN}/update-state`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Access-Control-Allow-Origin': '*'
            // // 'X-CSRF-Token': 'balabluebalablue'
        },
        body: JSON.stringify(updateParams)
    })

    request.then((res) => {
        if (res.status === 401) {
            // A status code of 401 implies that the operator does not have access.
            // This could be because access has not been requested or a 5 mins timeframe has elapsed from previous access grant.
            storage["access-token"] = null;
        }
    })

}
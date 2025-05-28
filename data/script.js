        
const container = document.getElementById("container");

// Configuration for arc controller
const radius = 100;
const centerX = 150; // Center of the container (300px width)
const centerY = 150; // Center of the container (300px height)
const startAngle = -90; // Start angle in degrees
const endAngle = 90; // End angle in degrees

// Create SVG and arc path
const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("width", "300px");
svg.setAttribute("height", "300px");

const arcPath = document.createElementNS(svgNS, "path");
const startRadians = (startAngle * Math.PI) / 180;
const endRadians = (endAngle * Math.PI) / 180;
const startX = centerX + radius * Math.cos(startRadians);
const startY = centerY + radius * Math.sin(startRadians);
const endX = centerX + radius * Math.cos(endRadians);
const endY = centerY + radius * Math.sin(endRadians);
const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

const arcD = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
arcPath.setAttribute("d", arcD);
arcPath.setAttribute("fill", "none");
arcPath.setAttribute("stroke", "teal");
arcPath.setAttribute("stroke-width", "10");

svg.appendChild(arcPath);
container.appendChild(svg);

// Create the indicator
const indicator = document.createElement("div");
indicator.classList.add("indicator");
container.appendChild(indicator);

// Function to update indicator position
function updateIndicator(angle) {
    const radians = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(radians);
    const y = centerY + radius * Math.sin(radians);
    indicator.style.left = `${x}px`;
    indicator.style.top = `${y}px`;
}

const infobtn = document.querySelector("#infobtn");
const closeBtn = document.querySelector(".close");

infobtn.addEventListener("click", function(e){
    document.querySelector(".modal-bg").style.display = "flex";
    document.body.style.overflowY = "hidden";
})

closeBtn.addEventListener("click", function(e){
    document.querySelector(".modal-bg").style.display = "none";
    document.body.style.overflowY = "auto"
})

// Set initial position of the indicator
let currentAngle = startAngle;
updateIndicator(currentAngle);

// Add drag functionality
let isDragging = false;

// indicator.addEventListener("mousedown", () => {
//     isDragging = true;
// });

//for mobiles
indicator.addEventListener("touchstart", () => {
    // alert();
    isDragging = true;
    document.body.style.overflowY = "hidden";
});

indicator.addEventListener("touchend", () => {
    // alert("touch end");
    isDragging = false;
    document.body.style.overflowY = "auto";
})

indicator.addEventListener("touchmove", (event) => {
    // alert(isDragging);
    if (!isDragging) return;

    const rect = container.getBoundingClientRect();
    const dx = event.touches[0].clientX - (rect.left + centerX);
    const dy = event.touches[0].clientY - (rect.top + centerY);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (angle < -180) angle += 360;
    if (angle > 180) angle -= 360;

    if (angle >= startAngle && angle <= endAngle) {
        currentAngle = angle;
        updateIndicator(currentAngle);
        onAngleChange(currentAngle);
    }
});

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
button1 = document.querySelector('.cbtn1');
button2 = document.querySelector('.cbtn2');

button1.addEventListener('click', function () {
    updateState(7, 1);
})
button2.addEventListener('click', function () {
    updateState(8, 1);
})


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
            if (token["access_token"]){
                console.log(token);
                console.log(token['access_token']);
                storage['access-token'] = token['access_token']; 
                show("Access Granted!");   
                gainAccessDiv.style.display = "none";
            }
            else{
                show('Access Denied. Try again later.');
            }
        })
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
    gainAccessDiv.style.display = hasAccess ? 'none' : 'block';
    if (!hasAccess) show("User currently has no access. Please click the button above to request");
    else show("This user currently has access");
    return hasAccess;
}

accReqButton = document.getElementById("acc-req");
accReqButton.addEventListener('click', (e)=>requestAccess())


document.addEventListener('DOMContentLoaded', function (ev) {
    checkAccess();
})

window.onload = ()=>checkAccess();

setInterval(checkAccess, 1000 * 60 * 1); //Check every 1 minute

function show(message) {
    document.querySelector(".notification-text").textContent = message;JsonDocument
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
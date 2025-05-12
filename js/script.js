let map;
let userLat = null;
let userLon = null;
let routeControl = null;
let userMarker = null;

function generateRandomPhone() {
  const prefixes = ['7', '8', '9'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = prefix + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return number;
}

function generateRandomOpeningHours() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map(day => `${day}: ${Math.floor(Math.random() * 4 + 8)}:00 - ${Math.floor(Math.random() * 4 + 17)}:00`).join("<br>");
}

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      userLat = position.coords.latitude;
      userLon = position.coords.longitude;
      initMap();
      fetchNearbyServices();
    }, () => alert("Unable to retrieve your location."));
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

function initMap() {
  if (map) {
    map.remove();
  }

  map = L.map('map').setView([userLat, userLon], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  const redIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  userMarker = L.marker([userLat, userLon], { icon: redIcon })
    .addTo(map)
    .bindPopup("Your Location")
    .openPopup();
}

function fetchNearbyServices() {
  const type = document.getElementById("serviceType").value;
  const filter = `node["amenity"="${type}"]`;

  const query = `
    [out:json];
    (
      ${filter}(around:5000,${userLat},${userLon});
    );
    out body;
  `;

  fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  })
  .then(res => res.json())
  .then(data => {
    if (!data.elements.length) {
      alert("No nearby services found.");
      return;
    }

    data.elements.forEach(el => {
      const { lat, lon, tags } = el;
      const name = tags.name || "Unnamed";
      const contact = tags.phone || generateRandomPhone();
      const hours = tags.opening_hours || generateRandomOpeningHours();

      const marker = L.marker([lat, lon]).addTo(map);
      marker.bindPopup(`
        <b>${name}</b><br>
        Contact: ${contact}<br>
        Hours: ${hours}<br>
        <button onclick="generateCard('${name}', '${contact}', \`${hours}\`)">Emergency Card</button><br>
        <button onclick="showRoute(${lat}, ${lon})">Show Route</button>
      `);
    });
  })
  .catch(err => {
    console.error("Error:", err);
    alert("Failed to load health services.");
  });
}

function showRoute(destLat, destLon) {
  if (routeControl) {
    map.removeControl(routeControl);
  }

  routeControl = L.Routing.control({
    waypoints: [
      L.latLng(userLat, userLon),
      L.latLng(destLat, destLon)
    ],
    routeWhileDragging: false
  }).addTo(map);
}

function generateCard(name, contact, openingHours) {
  document.getElementById("serviceName").innerText = name;
  document.getElementById("contact").innerText = contact;
  document.getElementById("openingHours").innerHTML = openingHours;
  document.getElementById("card").style.display = "block";

  const currentDate = new Date().toLocaleString();

  // Store emergency card data in Firebase Firestore
  db.collection("emergencyCards").add({
    name,
    contact,
    openingHours,
    date: currentDate
  })
  .then(() => {
    console.log("Card saved to history");
  })
  .catch((error) => {
    console.error("Error saving card:", error);
  });
}

// Load history from Firestore and show it
function loadHistory() {
  const historyDiv = document.getElementById("history");
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = '';
  historyDiv.style.display = "block";

  db.collection("emergencyCards").orderBy("date", "desc").get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${data.name}</strong> - ${data.contact}<br>
          ${data.openingHours}<br>
          <em>${data.date}</em><br>
          <button onclick="deleteHistory('${doc.id}')">Delete</button>
          <hr>
        `;
        historyList.appendChild(li);
      });
    }).catch((error) => {
      console.error("Error getting history:", error);
    });
}

// Delete specific history item from Firestore
function deleteHistory(id) {
  db.collection("emergencyCards").doc(id).delete()
    .then(() => {
      alert("History deleted");
      loadHistory(); // Refresh the list
    })
    .catch((error) => {
      console.error("Error deleting document:", error);
    });
}

// Expose functions globally
window.getLocation = getLocation;
window.generateCard = generateCard;
window.showRoute = showRoute;
window.loadHistory = loadHistory;
window.deleteHistory = deleteHistory;

function initialize() {
  if (navigator.geolocation)
    navigator.geolocation.getCurrentPosition(initMap, (err) => initMap(), {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  else initMap();
}

function initMap(position) {
  let activeWindow;

  const green_dot = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
  const yellow_dot = "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  const red_dot = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";

  const initialLocation = position
    ? new google.maps.LatLng(position.coords.latitude, position.coords.longitude)
    : new google.maps.LatLng(35.6762, 139.6503);

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 13,
    center: initialLocation,
    mapTypeControl: false,
  });

  map.addListener("click", function () {
    if (activeWindow) activeWindow.close();
  });

  if (navigator.geolocation) {
    const centerControlDiv = document.createElement("div");
    centerControlInit(centerControlDiv, map);
    map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(centerControlDiv);
  }

  fetch("public/data.json")
    .then((resp) => resp.json())
    .then((data) => {
      data
        .filter((d) => d.fee)
        .forEach((d) => {
          let fee = parseInt(d.fee.match(/\d+/g).join(""));
          let currency_parsed = fee.toLocaleString("en-US", {
            style: "currency",
            currency: "JPY",
          });

          let info = new google.maps.InfoWindow({
            content:
              `<div id="${d.id}">` +
              `<h2>${d.name}</h2>` +
              `<hr></hr>` +
              `<p><b>Notes: </b>${d.comment || ""}</p>` +
              `<p><b>Address: </b>${d.address}</p>` +
              `<p><b>Price: </b>${currency_parsed}</p>` +
              `</div>`,
          });
          let icon = fee <= 2500 ? green_dot : fee <= 3500 ? yellow_dot : red_dot;

          let marker = new google.maps.Marker({
            map,
            icon,
            zIndex: 10000 - fee,
            position: { lat: d.lat, lng: d.lng },
            title: d.name,
          });

          marker.addListener("click", () => {
            if (activeWindow) activeWindow.close();
            info.open(map, marker);
            activeWindow = info;
          });
        });
    })
    .catch((error) => console.log(error));
}

function centerControlInit(controlDiv, map) {
  const controlUI = document.createElement("div");
  controlUI.style.backgroundColor = "#fff";
  controlUI.style.border = "2px solid #fff";
  controlUI.style.borderRadius = "3px";
  controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
  controlUI.style.cursor = "pointer";
  controlUI.style.padding = "4px";
  controlUI.style.marginLeft = "12px";
  controlUI.style.marginBottom = "2px";
  controlUI.style.textAlign = "center";
  controlUI.style.width = "36px";
  controlUI.style.height = "36px";
  controlUI.title = "Click to re-center the map";
  controlDiv.appendChild(controlUI);

  const controlIcon = document.createElement("img");
  controlIcon.src = "public/compass.svg";
  controlIcon.style.width = "100%";
  controlIcon.style.objectFit = "contain";
  controlUI.appendChild(controlIcon);

  controlUI.addEventListener("click", function () {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var latLng = new google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude
        );
        map.setZoom(15);
        map.panTo(latLng);
      },
      null,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

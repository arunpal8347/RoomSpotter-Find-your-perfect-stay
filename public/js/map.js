apiKey = mapToken;

(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})
        ({key: apiKey, v: "weekly"});

let map;

let latVal = listing.geometry.coordinates[1];
let longVal = listing.geometry.coordinates[0];
async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
   const { AdvancedMarkerElement } = await google.maps.importLibrary("marker"); // Import AdvancedMarkerElement for modern markers

  map = new Map(document.getElementById("map"), {
    center: { lat: latVal, lng: longVal },
    zoom: 8,
    mapId: mapID
  });

  // Add a marker
    const marker = new AdvancedMarkerElement({
        map: map,
        position: { lat: latVal, lng: longVal },
        title: listing.title,
    });

    // Optional: Add an InfoWindow (popup) to the marker
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="font-family: sans-serif; padding: 5px;">
                <h5 style="margin-bottom: 5px;">${listing.title}</h5>
                <p style="margin: 0;">${listing.location}, ${listing.country}</p>
            </div>
        `,
    });

    // Add a listener to open the info window when the marker is clicked
    marker.addListener('click', () => { // Use marker.addListener for AdvancedMarkerElement
        infoWindow.open({
            anchor: marker,
            map,
        });
    });
}

initMap();
const inputField = document.getElementById("myInput");
const suggestionList = document.getElementById("suggestions");
const getLocationButton = document.getElementById("myForm");

let currentSuggestions = [];
let weatherData = null;
const suggestionDelay = 600;
const fetchDataDelay = 200;
let suggestionTimeoutId = null;
let fetchDataTimeoutId = null;



// notification access check
document.addEventListener('DOMContentLoaded', function() {
  function askNotificationPermission() {
   
    if(!("Notification" in window)) {
      alert("This browser does not support desktop notification");
   
    } else if (Notification.permission === "granted") {
      // notification for already access granted      
      new Notification("Hey!", {
        body: "Welcome..............",
        icon:"./assist/favicon.png",
      });


    } else if ( Notification.permission === "default") {
      Notification.requestPermission().then(function (permission) {
  
        // notification when access granted 
        if (permission === "granted") {
            new Notification("Hey!" , {
            body: "Thank you! You've allowed notifications.Stay Updated",
            icon:"./assist/favicon.png",
          });
        }
      });
    }
  }
  askNotificationPermission();
});

// getting user input from the html search box
inputField.addEventListener("input", () => {
  const input = inputField.value.trim().toLowerCase();
  if (suggestionTimeoutId) {
    clearTimeout(suggestionTimeoutId);
  }
  if (!input) {
    currentSuggestions = [];
    return;
  }

// getting location suggestion on the basic of user input and having delay so that multiple request is not sent at once that leads to error
  suggestionTimeoutId = setTimeout(async () => {
    try {
          const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?minPopulation=1000&namePrefix=${input}`;
          const response = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': '5e594862d6msh715ca40bd2fa8d5p1b54b8jsndb8b8067f91e',
            'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
           },
          });

         // const response = await fetch(
         //   `http://api.openweathermap.org/geo/1.0/direct?q=${input}&limit=5&appid=f98b28d544b208fdbbe50a7f9c7ca167`
         // );


        // changing fetched data into json format
        const lon_lag = await response.json();
        const data = lon_lag.data;

      //  checking the number of suggestion fetched and presenting it by creating new element
       if (data.length > 0) {
         currentSuggestions = data;
         suggestionList.innerHTML = "";
         currentSuggestions.forEach((location) => {
         const option = document.createElement("option");
         option.value = location.name;
         option.textContent = location.name;
         option.innerHTML = `<span>${location.city},${location.country}</span>`;
         suggestionList.appendChild(option);
        });
       } 
       else {
        currentSuggestions = [];
        suggestionList.innerHTML = "";
       }
      } 
       catch (error) {
       console.log("Error fetching places:", error);
      }
  }, suggestionDelay);
});

// submiting user input and getting the latitude and longitude according to user input if it find the same location name
getLocationButton.addEventListener("submit", async (e) => {
  e.preventDefault();
  const selected = inputField.value.trim().toLowerCase();
  const location = currentSuggestions.find((location) => location.name.toLowerCase() === selected);
  if (location) {
    const latitude = location.latitude;
    const longitude = location.longitude;
    if (fetchDataTimeoutId) {
      clearTimeout(fetchDataTimeoutId);
    }
    fetchDataTimeoutId = setTimeout(async () => {
      await display(latitude, longitude);
    }, fetchDataDelay);
  } else {
    console.log("Location not found");
  }
});

// getting latitude and longitude on the basic of current user location
function getWeather() {
  navigator.geolocation.getCurrentPosition(async (e) => {
    let { latitude, longitude } = e.coords;
    await display(latitude, longitude);
  });
}
getWeather();



async function display(latitude, longitude) {
   // loading animation till data is fetched
   const loader = document.getElementById("loading")
   function displayLoading(){
     loader.classList.add("display");
    }
   displayLoading();
  // fetching location all weather info by passing latitude and longitude
  try {
    const API_KEY = "f98b28d544b208fdbbe50a7f9c7ca167";
    const newData = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,daily&appid=${API_KEY}&units=metric`);
    const news = await fetch(`https://api.openweathermap.org/data/2.5/forecast/daily?lat=${latitude}&lon=${longitude}&cnt=17&appid=${API_KEY}&units=metric`);
    const hourly_result = await newData.json();
    const daily_result = await news.json();
    
    // removing the first,hour info 
    const hourly_info = hourly_result.hourly.slice(1, 48);
    const daily_info = daily_result.list;
   
    // hiding loading animation
    function hideLoading(){
      loader.classList.remove("display");
    }
    hideLoading();

    // passing fetched location name to html required place
    inputField.placeholder = `${daily_result.city.name}`;

    // changing first word to uppercase and passing to html at required place
    const text = hourly_result.current.weather[0].description;
    const words = text.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    document.getElementById("wea_desp").innerHTML = `${words.join(" ")}`;


    // getting the info for the required html field
    function data(hourly_result){
      // getting required info 
      let {wind_speed,pressure,uvi,sunset,sunrise,wind_deg,humidity,dt,temp} = hourly_result.current;
      const time_offset = hourly_result.timezone_offset;

      // converting fetched date data according to time zone
      const loc_time = new Date((dt + time_offset)*1000);
      document.getElementById("time").innerHTML=`${loc_time}`;
      document.getElementById("cur_temp").innerHTML = `${Math.round(temp)}&deg;C`;


      function notifyTemp() {
        const currentTemp = Math.round(temp); 
        const userInput = daily_result.city.name; // Assuming you get the user input from somewhere
      
        // Retrieve stored temperatures for all locations
        const storedTemps = getStoredTemperatures();
      
        // Check if the user input matches any location key
        if (userInput in storedTemps) {
          const oldTemp = storedTemps[userInput];
      
          if (oldTemp < currentTemp) {
            new Notification("Hey!", {
              body: `Temperature rise from ${oldTemp} to ${currentTemp}`,
              icon: "./assist/favicon.png",
            });
          } else if (oldTemp > currentTemp) {
            new Notification("Hey!", {
              body: `Temperature drop from ${oldTemp} to ${currentTemp}`,
              icon: "./assist/favicon.png",
            });
          } else {
            new Notification("Hey!", {
              body: "Temperature is constant till now.",
              icon: "./assist/favicon.png",
            });
          }
      
          // Update temperature for the matched location
          setTemperature(userInput, currentTemp);
        } else {
          
          // If user input doesn't match any location, store it as a new location
          setTemperature(userInput, currentTemp);
          new Notification("Hey!", {
            body: "New location and temperature noted.",
            icon: "./assist/favicon.png",
          });
        }
      }
      
      function getStoredTemperatures() {
        const storedTemps = localStorage.getItem('temperatures');
        if (storedTemps) {
          return JSON.parse(storedTemps);
        }
        return {};
      }
      
      function setStoredTemperatures(temperatures) {
        localStorage.setItem('temperatures', JSON.stringify(temperatures));
      }
      
      function setTemperature(location, temp) {
        const storedTemps = getStoredTemperatures();
        storedTemps[location] = temp;
        setStoredTemperatures(storedTemps);
      }
      
      notifyTemp();

      // converting fetched sunrise data according to time zone 
      const rise_date = new Date((sunrise + time_offset)*1000);
      const rise_hour = rise_date.getUTCHours();
      const rise_min = rise_date.getUTCMinutes();
      const rise_period = rise_hour >= 12 ? 'PM' : 'AM';
      const rise_mins = rise_min < 10 ? `0${rise_min}` : rise_min;
      const sun_rise = `${rise_hour % 12 || 12}:${rise_mins} ${rise_period}`;
      const srt = rise_hour % 12 || 12;
  
      // converting fetched sunset data according to time zone
      const set_date = new Date((sunset + time_offset)*1000);
      const set_hour = set_date.getUTCHours();
      const set_min = set_date.getUTCMinutes();
      const set_period = set_hour >= 12 ? 'PM' : 'AM';
      const set_mins = set_min < 10 ? `0${set_min}` : set_min;
      const sun_set = `${set_hour % 12 || 12}:${set_mins} ${set_period}`;
      const sst = set_hour % 12 || 12;
    

      // current device time
      const newDt = new Date();
      const cr_hr = newDt.getHours();
      const amm = cr_hr >= 12 ? "PM" : "AM";
      const ct = cr_hr % 12 || 12;

      // condition to check time and time period and changing the theam according to it
      if((ct === 12 && amm === rise_period)){
        document.getElementById("background_image").src = "images/landscape-1844231_1920.png";
        document.getElementById("background_imag").src = "images/landscape-1844231_1920.png";
        document.body.style.color = 'white';
        document.documentElement.style.setProperty('--border', 'rgb(255 255 255 / 50%)');
       }else if( (ct === 12 && amm === set_period)){
        document.getElementById("background_image").src = "images/landscape-1844229_1920.png";
        document.getElementById("background_imag").src = "images/landscape-1844229_1920.png";
        document.body.style.color = 'black';
        document.documentElement.style.setProperty('--border', 'rgb(0 0 0 / 50%)');
       }else if((ct <= srt  && amm === rise_period) || (ct >= sst  && amm === set_period ) ){
        document.getElementById("background_image").src = "images/landscape-1844231_1920.png";
        document.getElementById("background_imag").src = "images/landscape-1844231_1920.png";
        document.body.style.color = 'white';
        document.documentElement.style.setProperty('--border', 'rgb(255 255 255 / 50%)');
       }else if((ct >= srt  && amm === rise_period) || (ct <= sst  && amm === set_period)){
        document.getElementById("background_image").src = "images/landscape-1844229_1920.png";
        document.getElementById("background_imag").src = "images/landscape-1844229_1920.png";
        document.body.style.color = 'black';
        document.documentElement.style.setProperty('--border', 'rgb(0 0 0 / 50%)');
       }
       
  // passing the required html info
       document.getElementById("wind_speed").innerHTML = `${wind_speed}`;
       document.getElementById("info_dir").style.transform = `rotate(${wind_deg}deg)`;
       document.getElementById("humidity").innerHTML = `${humidity} %`;
       document.getElementById("pressure").innerHTML = `${pressure} hpa`;
       document.getElementById("uvi").innerHTML = `${uvi}`;
       document.getElementById("sun_rise").innerHTML = `${sun_rise}`;
       document.getElementById("sun_set").innerHTML = `${sun_set}`;
     }
     data(hourly_result);
     
                
  //  checking the weather condition and presenting the icon according to it (only for middle icon)
   function weatherIcone(){
    const conditon = hourly_result.current.weather[0].icon;
    if (conditon == "01d" || conditon == "01n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = `  <img src="assist/sun.png" />`;
    } else if (conditon == "02d" || conditon == "02n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/cloudy.png" />`;
    } else if (conditon == "03d" || conditon == "03n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/cloud.png" />`;
    } else if (conditon == "04d" || conditon == "04n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/cloudy(1).png" />`;
    } else if (conditon == "09d" || conditon == "09n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/rainy.png" />`;
    } else if (conditon == "10d" || conditon == "10n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/heavy-rain.png" />`;
    } else if (conditon == "11d" || conditon == "11n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/thunder.png" />`;
    } else if (conditon == "13d" || conditon == "13n") {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/snowing.png" />`;
    } else {
      document.getElementById(
        "wed_icon"
      ).innerHTML = ` <img src="assist/fog.png" />`;
    }
   }
   weatherIcone(); 

  

   // for not adding the multiple elements in each update i.e for clearing previous elements
   document.getElementById("weekly_weather").innerHTML = "";
 
 
   // for presenting daily info of 15 days
    daily_info.map((items, index) => {
      let conditon = items.weather[0].icon;

      if (conditon == "01d" || conditon == "01n") {
        icone = ' <img src="assist/sun.png" width="30px"/>';
      } else if (conditon == "02d" || conditon == "02n") {
        icone ='<img src="assist/cloudy.png" width="30px"/>';
      } else if (conditon == "03d" || conditon == "03n") {
        icone = '<img src="assist/cloud.png" width="30px"/>';
      } else if (conditon == "04d" || conditon == "04n") {
        icone ='<img src="assist/cloudy(1).png" width="30px"/>';
      } else if (conditon == "09d" || conditon == "09n") {
        icone =' <img src="assist/rainy.png" width="30px"/>';
      } else if (conditon == "10d" || conditon == "10n") {
        icone ='<img src="assist/heavy-rain.png" width="30px"/>';
      } else if (conditon == "11d" || conditon == "11n") {
        icone =' <img src="assist/thunder.png" width="30px"/>';
      } else if (conditon == "13d" || conditon == "13n") {
        icone =' <img src="assist/snowing.png" width="30px"/>';
      } else {
        icone = '<img src="assist/fog.png" width="30px"/>';
      }
      // for displaying the date 
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",];
      // current date 
      const unixTime = items.dt * 1000;
      const tim = new Date(unixTime);
      const month = tim.getUTCMonth();
      const dat = tim.getUTCDate();
      const day = tim.getUTCDay();

      if (index == 0) {
        document.getElementById("cur_day_time").innerHTML = days[day] + "," + dat + " " + months[month];
        document.getElementById("weekly_weather").innerHTML = 
        ` 
          <div class="next_days_info">
           <h3>The Next Day Forecast</h3>
           <p>15 Days Forecast</p>
          </div>
        `;
      } else {
        document.getElementById("weekly_weather").innerHTML +=
         `
           <div class="weekly_weather">
              <div class="weather_icon">${icone}</div>
              <div class="weather_day_date">
                <p>${days[day] + "," + dat + " " + months[month]}</p>
                <p style="font-size: 12px;">${items.weather[0].description}</p>
              </div>
              <div id="min_max_temp" class="min_max_temp">
                <p>${items.temp.min}&deg;</p>
                <p>${items.temp.max}&deg;</p>
              </div>
            </div>
         `;
      }
    });
   
    //  for not adding the multiple elements in each update i.e for clearing previous elements
    document.getElementById("hourly_forcaste").innerHTML = "";
     
    // for presenting hourly temp 
    hourly_info.map((items) => {
      
      let conditon = items.weather[0].icon;
      if (conditon == "01d" || conditon == "01n") {
        icone = ' <img src="assist/sun.png" width="40px"/>';
      } else if (conditon == "02d" || conditon == "02n") {
        icone ='<img src="assist/cloudy.png" width="40px"/>';
      } else if (conditon == "03d" || conditon == "03n") {
        icone = '<img src="assist/cloud.png" width="40px"/>';
      } else if (conditon == "04d" || conditon == "04n") {
        icone ='<img src="assist/cloudy(1).png" width="40px"/>';
      } else if (conditon == "09d" || conditon == "09n") {
        icone =' <img src="assist/rainy.png" width="40px"/>';
      } else if (conditon == "10d" || conditon == "10n") {
        icone ='<img src="assist/heavy-rain.png" width="40px"/>';
      } else if (conditon == "11d" || conditon == "11n") {
        icone =' <img src="assist/thunder.png" width="40px"/>';
      } else if (conditon == "13d" || conditon == "13n") {
        icone =' <img src="assist/snowing.png" width="40px"/>';
      } else {
        icone = '<img src="assist/fog.png" width="40px"/>';
      }

      // for hourly time
      const unixTimestamp = items.dt * 1000;
      const date = new Date(unixTimestamp);
      let hours = date.getHours();
      const amPm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const formattedHours = hours < 10 ? `0${hours}` : hours;
      const timeString = `${formattedHours} ${amPm}`;

      document.getElementById("hourly_forcaste").innerHTML += 
      `
       <div  class="hourly_forcaste">
         <div class="hourly_info">
            <div class="hr_time">${timeString}</div>
            <div style="font-size: 35px;padding: 5px;display: flex;justify-content: center;align-items: center;border-radius: 5px;background-color: #cecccc8c;">${icone}</div>
            <div style="font-size: 18px;font-weight: bold;">${Math.round(items.temp)}&deg;C</div>
          </div>
        </div> 
      `;
    });


    
  } catch (error) {
    console.log("Error fetching weather data:", error);
  }
}

  

   
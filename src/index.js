import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCmOhYGnXG8YgYuBic1RxfAt7vNLxMGPnA",
  authDomain: "fire-giftr-39adc.firebaseapp.com",
  projectId: "fire-giftr-39adc",
  storageBucket: "fire-giftr-39adc.appspot.com",
  messagingSenderId: "259061896471",
  appId: "1:259061896471:web:0b92a98a3461b569cdd352",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// get a reference to the database
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  //set up the dom events
  // document
  //   .getElementById("btnCancelPerson")
  //   .addEventListener("click", hideOverlay);
  // document
  //   .getElementById("btnCancelIdea")
  //   .addEventListener("click", hideOverlay);
  // document.querySelector(".overlay").addEventListener("click", hideOverlay);

  // document
  //   .getElementById("btnAddPerson")
  //   .addEventListener("click", showOverlay);
  // document.getElementById("btnAddIdea").addEventListener("click", showOverlay);

  getPeople();
});

// function hideOverlay(ev) {
//   ev.preventDefault();
//   document.querySelector(".overlay").classList.remove("active");
//   document
//     .querySelectorAll(".overlay dialog")
//     .forEach((dialog) => dialog.classList.remove("active"));
// }
// function showOverlay(ev) {
//   ev.preventDefault();
//   document.querySelector(".overlay").classList.add("active");
//   const id = ev.target.id === "btnAddPerson" ? "dlgPerson" : "dlgIdea";
//   //TODO: check that person is selected before adding an idea
//   document.getElementById(id).classList.add("active");
// }

const people = []; //to hold all the people from the collection

async function getPeople() {
  //call this from DOMContentLoaded init function
  //the db variable is the one created by the getFirestore(app) call.
  const querySnapshot = await getDocs(collection(db, "people"));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const id = doc.id;
    people.push({ id, ...data });
  });
  if (people.length > 0) {
    buildPeople(people);
    //highlights first person
    getIdeas(people[0].id);
  } else {
    const ul = document.querySelector("ul.person-list");
    ul.innerHTML = "";
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no people added</p>`;
  }
}

function buildPeople(people) {
  //build the HTML
  let ul = document.querySelector("ul.person-list");
  ul.addEventListener("click", personClicked);
  let months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  let index = 0;
  //replace the old ul contents with the new.
  ul.innerHTML = "";
  ul.innerHTML = people
    .map((person) => {
      const dob = `${months[person["birth-month"] - 1]} ${person["birth-day"]}`;
      if (index == 0) {
        index += 1;
        return `<li data-id="${person.id}" class="person active">
                <p class="name">${person.name}</p>
                <p class="dob">${dob}</p>
              </li>`;
      }
      return `<li data-id="${person.id}" class="person">
                <p class="name">${person.name}</p>
                <p class="dob">${dob}</p>
              </li>`;
    })
    .join("");
}

async function getIdeas(id) {
  //get an actual reference to the person document
  const personRef = doc(collection(db, "people"), id);
  const gifts = [];
  //then run a query where the `person-id` property matches the reference for the person
  const docs = query(
    collection(db, "gift-ideas"),
    where("person-id", "==", personRef)
  );
  const querySnapshot = await getDocs(docs);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const id = doc.id;
    gifts.push({ id, ...data });
  });
  let ul = document.querySelector("ul.idea-list");
  ul.innerHTML = "";
  if (gifts.length > 0) {
    ul.innerHTML = gifts.map((gift) => {
      return `<li class="idea" data-id = ${gift.id}><label for="chk-uniqueid"><input type="checkbox" id="chk-uniqueid" /> Bought</label>
      <p class="title">${gift.idea}</p>
      <p class="location">${gift.location}</p>`;
    });
  } else {
    ul.innerHTML = `<p class="empty">Oops! Looks like there are no gifts added for the selected person</p>`;
  }
}

function personClicked(ev) {
  const clickedPerson = ev.target.closest("li");
  if (clickedPerson) {
    document.querySelector(".active").classList.remove("active");
    clickedPerson.classList.add("active");
    const id = clickedPerson.dataset.id;
    getIdeas(id);
  }
}

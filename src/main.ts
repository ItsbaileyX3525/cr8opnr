const profileContainer = document.getElementById("profile-container") as HTMLImageElement;
//const gemBalance = document.getElementById("gem-balance") as HTMLParagraphElement;
const profileContainerDropDown = document.getElementById("profile-dropdown") as HTMLDivElement;
const signinButton = document.getElementById("signin-button") as HTMLParagraphElement;
const registerButton = document.getElementById("register-button") as HTMLParagraphElement;
const settingsButton = document.getElementById("settings-button") as HTMLParagraphElement;

profileContainer.addEventListener("click", () => {
    if (profileContainerDropDown.classList.contains("hidden")) {
        profileContainerDropDown.classList.remove("hidden")
    } else {
        profileContainerDropDown.classList.add("hidden")
    }
});

signinButton.addEventListener("click", () => {
    window.location.href = "/login"
});

registerButton.addEventListener("click", () => {
    window.location.href = "/register"
});

settingsButton.addEventListener("click", () => {
    window.location.href = "/settings"
});

const prizes = [
  "won a Steam gift card!",
  "won a Steam key!",
  "won 2 Steam keys!",
  "won 3 Steam keys!",
  "won 5 Steam keys!",
  "won a mystery Steam key!",
  "won a random Steam bundle!",
  "won a Steam wallet code!",
  "won an exclusive Steam game drop!",
  "won a surprise Steam code pack!",
  "won 50 gems!",
  "won 100 gems!",
  "won 150 gems!",
  "won 200 gems!",
  "won 250 gems!",
  "won 300 gems!",
  "won 400 gems!",
  "won 500 gems!",
  "won 600 gems!",
  "won 750 gems!",
  "won 800 gems!",
  "won 900 gems!",
  "won 1000 gems!",
  "won 1200 gems!",
  "won 1500 gems!",
  "won 2000 gems!",
  "won 2500 gems!",
  "won a jackpot of 5000 gems!",
  "won a mega 10000 gems prize!",
  "won a free case!",
  "won 2 free cases!",
  "won 3 free cases!",
  "won a discounted case!",
  "won a premium case!",
  "won a golden case!",
  "won an exclusive case bundle!",
  "won a surprise bonus case!",
  "won a rare free case drop!",
  "won a mystery case pack!"
];

const names = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank", "Ivy", "Jack",
  "Karen", "Leo", "Mona", "Nina", "Oscar", "Paul", "Quinn", "Rita", "Steve", "Tina",
  "Uma", "Victor", "Wendy", "Xander", "Yara", "Zane",
  "Aaron", "Abby", "Adrian", "Aiden", "Alex", "Alexa", "Amelia", "Andre", "Angela", "Anthony",
  "Bella", "Ben", "Bianca", "Blake", "Brandon", "Brianna", "Brooke", "Bruce", "Bryan", "Caleb",
  "Cameron", "Cara", "Carla", "Carter", "Cathy", "Chloe", "Chris", "Clara", "Cole", "Colin",
  "Daniel", "Derek", "Destiny", "Diego", "Donna", "Dylan", "Edward", "Elena", "Elijah", "Ella",
  "Emily", "Eric", "Ethan", "Fiona", "Finn", "Gabby", "Gabe", "Gavin", "George", "Gina",
  "Hailey", "Harper", "Harry", "Hazel", "Henry", "Hope", "Hunter", "Iris", "Isabel", "Ivan",
  "Jade", "James", "Jamie", "Jasmine", "Jason", "Jenna", "Jennifer", "Jeremy", "Jessica", "Joel",
  "Jordan", "Jose", "Joseph", "Joy", "Julia", "Justin", "Kara", "Kate", "Katherine", "Kayla",
  "Kelly", "Kevin", "Kim", "Kyle", "Lara", "Laura", "Lauren", "Liam", "Lily", "Logan",
  "Louis", "Lucas", "Lucy", "Luis", "Luke", "Maddie", "Madison", "Marcus", "Maria", "Mark",
  "Mason", "Matthew", "Maya", "Megan", "Melissa", "Michael", "Michelle", "Miles", "Naomi", "Natalie",
  "Nathan", "Nicole", "Noah", "Olivia", "Owen", "Pam", "Patricia", "Patrick", "Peter", "Peyton",
  "Phoebe", "Rachel", "Ray", "Rebecca", "Richard", "Robert", "Rose", "Ruby", "Ryan", "Samantha",
  "Samuel", "Sandra", "Sara", "Sarah", "Scott", "Sean", "Sebastian", "Seth", "Sophia", "Spencer",
  "Stella", "Summer", "Susan", "Sydney", "Taylor", "Thomas", "Travis", "Trinity", "Tyler", "Valerie",
  "Vanessa", "Veronica", "Vince", "Violet", "Vivian", "Walter", "Will", "William", "Willow", "Wyatt",
  "Zach", "Zara", "Zeke", "Zoey"
];
function censorName(name: string) {
  return name.slice(0, 2) + "*****"
}


function generateWinner(): string {
  const randomname = names[Math.floor(Math.random() * names.length)]
  const censoredname = censorName(randomname)
  const randomprize = prizes[Math.floor(Math.random() * prizes.length)]
  return `${censoredname} ${randomprize}`
}

function populateScrollingText(): void {
  const textcontainer = document.getElementById("random-winner-text")
  if (textcontainer) {
    textcontainer.innerHTML = ""
    for (let i = 0; i < 15; i++) {
      const winner = document.createElement("span")
      winner.textContent = generateWinner()
      winner.className = "px-6"
      textcontainer.appendChild(winner)
    }
  }
}

function startContinuousScrolling(): void {
  const textcontainer = document.getElementById("random-winner-text")
  const banner = document.getElementById("random-winner-banner")
  if (textcontainer && banner) {
    let position = banner.offsetWidth
    function scroll() {
      position -= 1
      if (textcontainer && banner) {
        if (position <= -textcontainer.offsetWidth) {
            position = banner.offsetWidth
        }        
      }


      //Type script for fucks sake there is no way this is null
      //@ts-ignore
      textcontainer.style.transform = `translateX(${position}px)`
      requestAnimationFrame(scroll)
    }
    textcontainer.style.position = "absolute"
    textcontainer.style.marginTop = "-40px"
    textcontainer.style.transform = "translateY(-50%)"
    scroll()
  }
}

document.addEventListener("DOMContentLoaded", () => {
    populateScrollingText()
    startContinuousScrolling()
})

// Why does this affect other statements when the previous statement doesnt end in a ;?
//(()=>{(()=>{(()=>{console.log("This works lol")})();})();})();

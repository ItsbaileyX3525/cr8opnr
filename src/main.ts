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
  "won a Steam card!",
  "won a Steam key!",
  "won 2 Steam keys!",
  "won 3 Steam keys!",
  "won 5 Steam keys!",
  "won a mystery Steam key!",
  "won a Steam bundle!",
  "won a wallet code!",
  "won an game drop!",
  "won a code pack!",
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
  "won a jackpot of gems!",
  "won a mega gem prize!",
  "won a free case!",
  "won 2 free cases!",
  "won 3 free cases!",
  "won a discounted case!",
  "won a premium case!",
  "won a golden case!",
  "won an case bundle!",
  "won a bonus case!",
  "won a case drop!",
  "won a case pack!"
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
function censorname(name: string) {
  return name.slice(0, 2) + "***"
}

function generatewinner(): string {
  const randomname = names[Math.floor(Math.random() * names.length)]
  const censoredname = censorname(randomname)
  const randomprize = prizes[Math.floor(Math.random() * prizes.length)]
  return `${censoredname} ${randomprize}`
}

function startcontinuouslist(): void {
  const textcontainer = document.getElementById("random-winner-text")
  if (!textcontainer) return

  textcontainer.style.display = "flex"
  textcontainer.style.flexDirection = "column"
  textcontainer.style.justifyContent = "flex-end"
  textcontainer.style.overflow = "hidden"
  textcontainer.style.padding = "10px"
  textcontainer.style.gap = "16px"
  textcontainer.style.boxSizing = "border-box"
  

  const itemheight = 36
  const maxitems = 14
  const winners: HTMLDivElement[] = []

  function addwinner() {
    const wrapper = document.createElement("div")
    wrapper.textContent = generatewinner()
    wrapper.style.background = "linear-gradient(90deg, #b366ff, #8a2be2)"
    wrapper.style.color = "#fff"
    wrapper.style.fontSize = "13px"
    wrapper.style.fontWeight = "600"
    wrapper.style.height = `${itemheight}px`
    wrapper.style.width = `250px`
    wrapper.style.margin = "0 auto"
    wrapper.style.display = "flex"
    wrapper.style.alignItems = "center"
    wrapper.style.justifyContent = "center"
    wrapper.style.opacity = "0"
    wrapper.style.transform = "translateY(30px)"
    wrapper.style.transition = "all 0.4s ease"

    textcontainer.appendChild(wrapper)
    winners.push(wrapper)

    requestAnimationFrame(() => {
      wrapper.style.opacity = "1"
      wrapper.style.transform = "translateY(0)"
    })

    if (winners.length > maxitems) {
      const oldest = winners.shift()
      if (oldest) {
        oldest.style.opacity = "0"
        oldest.style.transform = `translateY(-${itemheight + 6}px)`
        setTimeout(() => oldest.remove(), 400)
      }
    }
<<<<<<< HEAD
=======
    textcontainer.style.position = "absolute"
    textcontainer.style.marginTop = "-25px"
    textcontainer.style.transform = "translateY(-50%)"
    scroll()
>>>>>>> f06965c4a2438e8a83387882cd289df479398b52
  }

  setInterval(addwinner, 3000)
}

document.addEventListener("DOMContentLoaded", () => {
  startcontinuouslist()
})

// Why does this affect other statements when the previous statement doesnt end in a ;?
//(()=>{(()=>{(()=>{console.log("This works lol")})();})();})();


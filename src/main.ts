const profileContainer = document.getElementById("profile-container") as HTMLImageElement;
//const gemBalance = document.getElementById("gem-balance") as HTMLParagraphElement;
const profileContainerDropDown = document.getElementById("profile-dropdown") as HTMLDivElement;
const signinButton = document.getElementById("signin-button") as HTMLParagraphElement;
const registerButton = document.getElementById("register-button") as HTMLParagraphElement;
//const settingsButton = document.getElementById("settings-button") as HTMLParagraphElement;

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

// Why does this affect other statements when the previous statement doesnt end in a ;?
(()=>{(()=>{(()=>{console.log("This works lol")})();})();})();

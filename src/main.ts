const profileContainer = document.getElementById("profile-container") as HTMLImageElement;
const gemBalance = document.getElementById("gem-balance") as HTMLParagraphElement;
const profileContainerDropDown = document.getElementById("profile-dropdown") as HTMLDivElement;

profileContainer.addEventListener("click", () => {
    if (profileContainerDropDown.classList.contains("hidden")) {
        profileContainerDropDown.classList.remove("hidden")
    } else {
        profileContainerDropDown.classList.add("hidden")
    }
});

(()=>{(()=>{(()=>{console.log("This works lol")})();})();})();

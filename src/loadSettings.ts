const profileButton = document.getElementById('profile-button') as HTMLParagraphElement;
const accountButton = document.getElementById('account-button') as HTMLParagraphElement;
const privacyButton = document.getElementById('privacy-button') as HTMLParagraphElement;

const profileSection = document.getElementById('profile-section') as HTMLDivElement;
const accountSection = document.getElementById('account-section') as HTMLDivElement;
const privacySection = document.getElementById('privacy-section') as HTMLDivElement;

function addHighlight(el: string): void {
    profileButton.classList.remove("text-white");
    accountButton.classList.remove("text-white");
    privacyButton.classList.remove("text-white");
    profileButton.classList.remove("text-gray-400");
    accountButton.classList.remove("text-gray-400");
    privacyButton.classList.remove("text-gray-400");
    
    profileSection.classList.remove("flex");
    accountSection.classList.remove("flex");
    privacySection.classList.remove("flex");
    profileSection.classList.remove("hidden");
    accountSection.classList.remove("hidden");
    privacySection.classList.remove("hidden");

    if (el == "Profile") {
        profileButton.classList.add("text-gray-400");
        accountButton.classList.add("text-white");
        privacyButton.classList.add("text-white");

        profileSection.classList.add("flex")
        accountSection.classList.add("hidden")
        privacySection.classList.add("hidden")
    } else if (el == "Account") {
        profileButton.classList.add("text-white");
        accountButton.classList.add("text-gray-400");
        privacyButton.classList.add("text-white");

        profileSection.classList.add("hidden")
        accountSection.classList.add("flex")
        privacySection.classList.add("hidden")
    } else {
        profileButton.classList.add("text-white");
        accountButton.classList.add("text-white");
        privacyButton.classList.add("text-gray-400");

        profileSection.classList.add("hidden")
        accountSection.classList.add("hidden")
        privacySection.classList.add("flex")
    }
}

profileButton.addEventListener('click', () => {
    addHighlight("Profile");
})

accountButton.addEventListener('click', () => {
    addHighlight("Account");
})

privacyButton.addEventListener('click', () => {
    addHighlight("Privacy")
})
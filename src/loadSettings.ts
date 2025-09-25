const profileButton = document.getElementById('profile-button') as HTMLParagraphElement;
const accountButton = document.getElementById('account-button') as HTMLParagraphElement;
const privacyButton = document.getElementById('privacy-button') as HTMLParagraphElement;

const profileSection = document.getElementById('profile-section') as HTMLDivElement;
const accountSection = document.getElementById('account-section') as HTMLDivElement;
const privacySection = document.getElementById('privacy-section') as HTMLDivElement;

const submitNewUsername = document.getElementById('submit-username') as HTMLInputElement;
const submitNewPassword = document.getElementById('submit-password') as HTMLInputElement;
const newUsernameStatus = document.getElementById('username-changed-status') as HTMLLabelElement;
const newPasswordStatus = document.getElementById('password-changed-status') as HTMLLabelElement;

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

submitNewPassword.addEventListener('click', async () => {
    const currPassword = document.getElementById('curr-password') as HTMLInputElement;
    const newPassword = document.getElementById('new-password') as HTMLInputElement;

    const currPasswordString = currPassword.value
    const newPasswordString = newPassword.value

    console.log(newPasswordString)
    console.log(currPasswordString)

	fetch("/api/changepassword", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
            currPassword: currPasswordString,
            newPassword: newPasswordString
        })
	})
	.then(async response => {
		if (!response.ok) {
			return Promise.reject(new Error(`HTTP error! status: ${response.status}`));
		}
		const data = await response.json();
        console.log(data)
        if (data.success) {
            newPasswordStatus.classList.add("text-green-500")
            newPasswordStatus.classList.remove("text-red-500")
            newPasswordStatus.innerText = "Password changed successfully!"
            newPasswordStatus.classList.remove("hidden")
            submitNewPassword.disabled = true;
        } else {
            newPasswordStatus.classList.remove("text-green-500")
            newPasswordStatus.classList.add("text-red-500")
            newPasswordStatus.innerText = data.message
        }
	});
})

submitNewUsername.addEventListener('click', () => {

    const newUsername = document.getElementById('new-user') as HTMLInputElement;
    const currPassword = document.getElementById('curr-pwd-usr') as HTMLInputElement;

    const newUsernameString = newUsername.value
    const currPasswordString = currPassword.value

	fetch("/api/changeusename", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
            username: newUsernameString,
            password: currPasswordString
        })
	})
	.then(async response => {
		if (!response.ok) {
			return Promise.reject(new Error(`HTTP error! status: ${response.status}`));
		}
		const data = await response.json();
        console.log(data)
        if (data.success) {
            newUsernameStatus.classList.add("text-green-500")
            newUsernameStatus.classList.remove("text-red-500")
            newUsernameStatus.innerText = "Username changed successfully!"
            newUsernameStatus.classList.remove("hidden")
            submitNewUsername.disabled = true;
        } else {
            newUsernameStatus.classList.remove("text-green-500")
            newUsernameStatus.classList.add("text-red-500")
            newUsernameStatus.innerText = data.message
        }
	});
})
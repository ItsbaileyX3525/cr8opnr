const form = document.getElementById("register-form") as HTMLFormElement;
const statusText = document.getElementById("status-text") as HTMLParagraphElement;

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form)

    const username = formData.get("username")
    const email = formData.get("email")
    const password = formData.get("password")
    const confirmPassword = formData.get("confirm-password")

    if (password !== confirmPassword) {
        statusText.classList.remove("text-green-300")
        statusText.classList.add("text-red-500")
        statusText.innerText = "Passwords don't match!"
        return
    }

    console.log(username, email, password, confirmPassword)

	fetch("/api/signup", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
            username: username,
            email: email,
            password: password
        })
	})
	.then(async response => {
		if (!response.ok) {
			return Promise.reject(new Error(`HTTP error! status: ${response.status}`));
		}
		const data = await response.json();
        if (data.success == true) {
            console.log("Account created!")
        }
	});
})
const statusText = document.getElementById("status-text") as HTMLParagraphElement;
const form = document.getElementById("login-form") as HTMLFormElement;
const submitButton = document.getElementById('login-submit') as HTMLButtonElement;

form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const data = new FormData(form)

    const username = data.get('username')
    const password = data.get('password')

	fetch("/api/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
            username: username,
            password: password
        })
	})
	.then(async response => {
		if (!response.ok) {
			return Promise.reject(new Error(`HTTP error! status: ${response.status}`));
		}
		const data = await response.json();
        if (data.success) {
            statusText.classList.add("text-green-300")
            statusText.classList.remove("text-red-500")
            statusText.innerText = "Logged in successfully!"
            submitButton.disabled = true;
            setTimeout(() => {
                window.location.href = "/"
            }, 1500);
        } else {
            statusText.classList.remove("text-green-300")
            statusText.classList.add("text-red-500")
            statusText.innerText = data.message
        }
	});
})
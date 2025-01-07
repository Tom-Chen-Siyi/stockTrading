// 切换到注册页面
document.getElementById("show-register").addEventListener("click", () => {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
});

// 切换到登录页面
document.getElementById("show-login").addEventListener("click", () => {
    document.getElementById("register-form").style.display = "none";
    document.getElementById("login-form").style.display = "block";
});

// 注册功能
document.getElementById("register-btn").addEventListener("click", async () => {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    if (!username || !password) {
        document.getElementById("message").textContent = "Username and password cannot be empty！";
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
        });
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);  // 如果响应失败，抛出错误
        }

        const result = await response.json();
        if (result.success) {
            // 注册成功后显示成功消息，并切换到登录
            document.getElementById("message").textContent = result.message;
            document.getElementById("message").style.color = "green";  // 成功时设置绿色

            setTimeout(() => {
                // 隐藏注册表单，显示登录表单
                document.getElementById("register-form").style.display = "none";
                document.getElementById("login-form").style.display = "block";
            }, 2000);  // 2秒后切换到登录页面
        } else {
            // 注册失败时显示错误消息
            document.getElementById("message").textContent = result.message;
            document.getElementById("message").style.color = "red";  // 失败时设置红色
        }
    } catch (error) {
        console.error("注册失败：", error);
        document.getElementById("message").textContent = "An error occurred during registration. Please try again later。";
        document.getElementById("message").style.color = "red";  // 设置为红色错误提示
    }
});


// 登录功能
document.getElementById("login-btn").addEventListener("click", async () => {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
        document.getElementById("message").textContent = "Username and password cannot be empty！";
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
        });

        const result = await response.json();
        if (result.success) {
            window.location.href = "index.html"; // 登录成功后跳转
        } else {
            document.getElementById("message").textContent = result.message;
            document.getElementById("message").style.color = "red";  // 错误时显示红色
        }
    } catch (error) {
        console.error("登录失败：", error);
        document.getElementById("message").textContent = "An error occurred during registration. Please try again later。";
        document.getElementById("message").style.color = "red";  // 错误提示
    }
});











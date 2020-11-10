if(typeof window.lang == "undefined" || window.lang == null || (window.lang != 'ru' && window.lang != 'en')) {
	var lang = 'ru';
}
if('serviceWorker' in navigator && 'PushManager' in window) {
	registerServiceWorker();
	if(window.Notification.permission == 'granted') {
		navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
			serviceWorkerRegistration.pushManager.getSubscription()
			.then(function(subscription) {
				if (!subscription) {
					subscribeUserToPush();
					return;
				}
				sendTokenToServer(JSON.stringify(subscription));
			})
			.catch(function(err) {
				window.Demo.debug.log('Error during getSubscription()', err);
			});
		});
	} else {
		pushButtonStatus(0);
		if(localStorage.getItem('PushNotification')!==null) {localStorage.removeItem("PushNotification");}
		if(localStorage.getItem('PushNotificationLastUpdate')!==null) {localStorage.removeItem("PushNotificationLastUpdate");}
	}
} else {
	pushButtonStatus(0);
}
$("#pushsubscribestatus").click(function() {
	$(this).hide();
	$.ajax({
		type: "POST",
		url: "/user_app/view",
		data: {
			lang: window.lang
		},
		dataType: "html",
	}).error(function(jqXHR, textStatus) {
		alert(notifiPushLang[lang]['error']['unknown']);
		return false;
	}).done(function(respond) {
		$("body").append(respond);
	});
});
function registerServiceWorker() {
	return navigator.serviceWorker.register('/sw.js')
	.then(function(registration) {
		console.log('Service worker successfully registered.');
		return registration;
	})
	.catch(function(err) {
		console.error('Unable to register service worker.', err);
		return false;
	});
}
function urlBase64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding)
	.replace(/\-/g, '+')
	.replace(/_/g, '/')
	;
	const rawData = window.atob(base64);
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
function subscribeUserToPush() {
	return navigator.serviceWorker.register('/sw.js')
	.then(function(registration) {
		const subscribeOptions = {
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(
				'BPla15wSEj6brnfWRh4WOWQuwh8BUSl43Cu0G2hOzLIZULs4xUE9iCSdxHnXxNguK5qgSfkcgrb1CAJXtnOA4WM'
			)
		};
		return registration.pushManager.subscribe(subscribeOptions);
	})
	.then(function(pushSubscription) {
		const pushSubscriptionJson = JSON.stringify(pushSubscription);
		console.log('Received PushSubscription: ', pushSubscriptionJson);
		sendTokenToServer(pushSubscriptionJson);
	}).catch((error) => {
		pushButtonStatus(0);
		console.log('ServiceWorker registration failed: ', err);
	});
}
function requestPermission() {
	return new Promise(function(resolve, reject) {
		const permissionResult = Notification.requestPermission(function(result) {
			resolve(result);
		});
		if (permissionResult) {
			permissionResult.then(resolve, reject);
		}
	})
	.then(function(permissionResult) {
		if (permissionResult !== 'granted') {
			console.log(permissionResult);
			throw new Error('Permission not granted.');
		} else {
			console.log('Permission granted');
			subscribeUserToPush();
		}
	});
}
function sendTokenToServer(pushSubscriptionJson) {
	const pushSubscription = JSON.parse(pushSubscriptionJson);
	if(!'keys' in pushSubscription || !'p256dh' in pushSubscription.keys || pushSubscription.keys.p256dh =='undefined' || !'auth' in pushSubscription.keys || pushSubscription.keys.auth =='undefined') {
		console.log('Not enough data in the pushSubscription object.');
		pushButtonStatus(0);
		return false;
	}
	
	let dateNow = Date.now();
	let pushNotificationLastUpdate = localStorage.getItem('PushNotificationLastUpdate');
	if(pushNotificationLastUpdate === null || (dateNow - pushNotificationLastUpdate) > 10000) {
		localStorage.setItem('PushNotificationLastUpdate', dateNow);
	} else {
		pushButtonStatus(1);
		return true;
	}
	if(!writeTokenToLocalStorage(pushSubscriptionJson)) {
		pushButtonStatus(0);
		return false;
	}
	console.log('Sending a token to the server.');
	$.ajax({
		type: "POST",
		url: "/user_app/add",
		data: {
			subscription: pushSubscriptionJson
		},
		dataType: "json",
	}).error(function(jqXHR, textStatus) {
		console.log(notifiPushLang[lang]['error']['unknown']);
		pushButtonStatus(0);
	}).done(function(respond) {
		if(typeof respond.error !="undefined" && typeof notifiPushLang[lang]['error'][respond.error] !="undefined") {
			console.log(notifiPushLang[lang]['error'][respond.error]);
			localStorage.removeItem("PushNotification");
			pushButtonStatus(0);
		} else if(typeof respond.success =="undefined") {
			console.log(notifiPushLang[lang]['error'][respond.answer]);
			localStorage.removeItem("PushNotification");
			pushButtonStatus(0);
		} else {
			pushButtonStatus(1);
		}
	});
}
function writeTokenToLocalStorage(currentToken) {
	localStorage.setItem('PushNotification', currentToken);
	console.log('Write the token to the local storage.');
	let pushNotification = localStorage.getItem('PushNotification');
	if(pushNotification === null) {
		localStorage.removeItem("PushNotification");
		console.log(notifiPushLang[lang]['error']['localStorage']);
		pushButtonStatus(0);
		return false;
	} else if(pushNotification == currentToken) {return true;}
}
function pushButtonStatus(status) {
	if(status && typeof window.user_notifications != "undefined" && user_notifications) {
		$('#pushsubscribestatus').css({'background-color': '#00c000', 'box-shadow': '0 0 2px #00c000', 'opacity': '0.7'});
	} else {
		$('#pushsubscribestatus').css({'background-color': '#81A8CB', 'box-shadow': '0 0 2px #81A8CB', 'opacity': '1'});
	}
}
var notifiPushLang = {
	ru: {
		success: "Вы подписаны на уведомления",
		error: {
			serviceWorker: "Service Worker не поддерживается или отключен в этом браузере",
			pushManager: "Push не поддерживаются или отключены в этом браузере",
			localStorage: "Нет места в локальном хранилище",
			answer: "Ошибка при получении ответа",
			unknown: "Неизвестная ошибка",
			data: "Ошибка в отправляемых данных",
			endpoint: "Ошибка адреса конечной точки",
			auth: "Ошибка ключа auth",
			p256dh: "Ошибка ключа p256dh",
			robot: "Роботы не могут подписываться на уведомления",
			login: "Вы должны зарегистрироваться или авторизоваться",
			no_user: "Нет такого пользователя",
			noaccess: "Вам запрещён доступ на сайт",
			unsubscribe: "<div style='text-align:center; font-size:30px; font-weight:700; color:#ffffff; background:#ff6666; margin-bottom:10px'>:-(</div><div style='font-weight:700; text-align:center; margin-bottom:5px'>Настройка уведомлений, если вы не на сайте</div>К сожалению, вы отписались от получения уведомлений с нашего сайта в вашем браузере, или ваш браузер не поддерживает эту возможность.",
		}
	},
	en: {
		success: "You are subscribed to notifications",
		error: {
			serviceWorker: "Service Worker is not supported or disabled in this browser",
			pushManager: "Push is not supported or disabled in this browser",
			localStorage: "No space in local storage",
			answer: "Error getting response",
			unknown: "Unknown error",
			data: "Error in sending data",
			endpoint: "Endpoint error",
			auth: "auth key error",
			p256dh: "p256dh key error",
			robot: "Robots cannot subscribe to notifications",
			login: "You must register or log in",
			no_user: "No such user",
			noaccess: "You are denied access to the site",
			unsubscribe: "<div style='text-align:center; font-size:30px; font-weight:700; color:#ffffff; background:#ff6666; margin-bottom:10px'>:-(</div><div style='font-weight:700; text-align:center; margin-bottom:5px'>Set up notifications if you are not online</div>Unfortunately, you have unsubscribed from receiving notifications from our site in your browser, or your browser does not support this feature.",
		}
	}
};

// Улучшенный скрипт для установки и управления Service Worker

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = document.getElementById('install-btn');
        this.isInstalled = false;
        
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupUpdateChecker();
        this.trackInstallation();
        this.setupBeforeInstallPrompt();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker зарегистрирован:', registration);

                // Проверяем обновления каждые 30 секунд
                setInterval(() => {
                    registration.update();
                }, 30000);

                // Слушаем обновления Service Worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });

            } catch (error) {
                console.error('Ошибка регистрации Service Worker:', error);
            }
        }
    }

    setupBeforeInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
            
            // Логируем событие для аналитики
            this.trackEvent('install_prompt_shown');
        });
    }

    setupInstallPrompt() {
        if (this.installButton) {
            this.installButton.addEventListener('click', async () => {
                if (this.deferredPrompt) {
                    // Показываем промпт установки
                    this.deferredPrompt.prompt();
                    
                    // Ждем ответа пользователя
                    const { outcome } = await this.deferredPrompt.userChoice;
                    
                    // Логируем результат
                    this.trackEvent('install_prompt_result', { outcome });
                    
                    if (outcome === 'accepted') {
                        console.log('Пользователь принял установку');
                    } else {
                        console.log('Пользователь отклонил установку');
                    }
                    
                    this.deferredPrompt = null;
                    this.hideInstallButton();
                }
            });
        }
    }

    setupUpdateChecker() {
        // Проверяем, есть ли обновления при загрузке страницы
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.update();
            });
        }
    }

    trackInstallation() {
        // Отслеживаем успешную установку
        window.addEventListener('appinstalled', () => {
            console.log('PWA успешно установлено');
            this.isInstalled = true;
            this.hideInstallButton();
            this.trackEvent('app_installed');
            this.showInstallSuccessMessage();
        });

        // Проверяем, запущено ли как standalone приложение
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            this.isInstalled = true;
            this.hideInstallButton();
        }
    }

    showInstallButton() {
        if (this.installButton && !this.isInstalled) {
            this.installButton.style.display = 'flex';
            this.installButton.classList.add('animate-in');
        }
    }

    hideInstallButton() {
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }
    }

    showUpdateNotification() {
        // Создаем уведомление об обновлении
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span class="update-icon">🔄</span>
                <div class="update-text">
                    <strong>Доступно обновление</strong>
                    <p>Новая версия приложения готова к установке</p>
                </div>
                <button class="update-btn" onclick="window.location.reload()">
                    Обновить
                </button>
            </div>
        `;

        // Добавляем стили для уведомления
        const style = document.createElement('style');
        style.textContent = `
            .update-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                max-width: 350px;
                animation: slideDown 0.3s ease-out;
            }
            
            .update-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .update-icon {
                font-size: 24px;
                animation: spin 2s linear infinite;
            }
            
            .update-text strong {
                color: #1976d2;
                font-size: 16px;
            }
            
            .update-text p {
                color: #666;
                font-size: 14px;
                margin: 5px 0 0 0;
            }
            
            .update-btn {
                background: #1976d2;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .update-btn:hover {
                background: #1565c0;
                transform: translateY(-1px);
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(notification);

        // Убираем уведомление через 10 секунд
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 10000);
    }

    showInstallSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'install-success';
        message.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <div class="success-text">
                    <strong>Приложение установлено!</strong>
                    <p>Теперь вы можете найти его на главном экране</p>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .install-success {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(76, 175, 80, 0.95);
                color: white;
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                max-width: 350px;
                animation: slideUp 0.3s ease-out;
            }
            
            .success-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .success-icon {
                font-size: 24px;
            }
            
            .success-text strong {
                font-size: 16px;
            }
            
            .success-text p {
                font-size: 14px;
                margin: 5px 0 0 0;
                opacity: 0.9;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
            style.remove();
        }, 5000);
    }

    trackEvent(eventName, properties = {}) {
        // Отправляем события в аналитику (Google Analytics, Yandex Metrica и т.д.)
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
        
        if (typeof ym !== 'undefined') {
            ym(123456, 'reachGoal', eventName, properties);
        }
        
        console.log('PWA Event:', eventName, properties);
    }

    // Методы для внешнего использования
    checkForUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.update();
            });
        }
    }

    getInstallationStatus() {
        return {
            isInstalled: this.isInstalled,
            canInstall: !!this.deferredPrompt,
            isStandalone: window.matchMedia('(display-mode: standalone)').matches
        };
    }
}

// Инициализируем PWA Installer при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.pwaInstaller = new PWAInstaller();
});

// Экспортируем для глобального использования
window.PWAInstaller = PWAInstaller;
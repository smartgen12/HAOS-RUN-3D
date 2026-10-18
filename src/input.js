export class InputManager {
    constructor() {
        this.keys = {};
        this.handlers = {};

        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyP', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
                e.preventDefault();
            }
            if (!this.keys[e.code]) {
                this.trigger(e.code);
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        let touchStartX = 0;
        let touchStartY = 0;

        window.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const deltaY = e.changedTouches[0].clientY - touchStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 35) this.trigger('SwipeRight');
                else if (deltaX < -35) this.trigger('SwipeLeft');
            } else {
                if (deltaY < -35) this.trigger('SwipeUp');
                else if (deltaY > 35) this.trigger('SwipeDown');
            }
        }, { passive: true });
    }

    on(action, callback) {
        if (!this.handlers[action]) this.handlers[action] = [];
        this.handlers[action].push(callback);
    }

    trigger(action) {
        if (this.handlers[action]) {
            this.handlers[action].forEach(cb => cb());
        }
    }
}

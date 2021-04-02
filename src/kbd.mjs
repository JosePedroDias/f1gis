export const keysDown = {};
export const keysJustDown = {};
export const keysJustUp = {};

export function updateKeys() {
    const bags = [keysJustDown, keysJustUp];
    for (const bag of bags) {
        for (let k of Object.keys(bag)) {
            bag[k] = false;
        }
    }
}

export function subscribeKeys() {
    function onKey(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const key = ev.key;
        const isDown = ev.type === 'keydown';
        const keysJust = isDown ? keysJustDown : keysJustUp;
        keysDown[key] = isDown;
        keysJust[key] = true;
        //console.log(key);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
}

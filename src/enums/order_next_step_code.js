// What a booking is waiting on its customer to do, as `next_step.code` says it
// (SD-1230). The console writes the button's words in `next_step.label`; the
// code only decides where the button goes. A code this app does not know gets
// no button, rather than one that goes nowhere.
const OrderNextStepCode = Object.freeze({
    // Nothing has been paid. The room is held at a price that only paying keeps.
    PAY: 'pay',
});

export default OrderNextStepCode;

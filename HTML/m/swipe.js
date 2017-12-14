'use strict';

const THRESHOLD = 50;

$(() => {

    log('ontouchstart' in window ?
        'Touch supported' : 'Touch not supported');

    $('.carousel')
        .on('touchstart', e => {

            /* FIXME: Chrome warning, passive event listener.
               https://github.com/jquery/jquery/issues/2871 */

            if (!e.touches.length)
                return;
            let start = e.touches[0].pageX;
            let $this = $(e.currentTarget);
            $this.on('touchmove', e => {
                let x = e.touches[0].pageX;
                let diff = start - x;
                if (Math.abs(diff) >= THRESHOLD) {
                    $this.off('touchmove');
                    $this.carousel(diff > 0 ? 'next' : 'prev');
                }
            });
        })
        .on('touchcancel', e => {
            $(e.currentTarget).off('touchmove');
        });
});

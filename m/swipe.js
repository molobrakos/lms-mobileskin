"use strict";

var THRESHOLD = 25;

$(() => {

    log('ontouchstart' in window ?
        'Touch supported' : 'Touch not supported');

    $('.carousel')
        .on('touchstart', e => {

            /* FIXME: Chrome warning, passive event listener.
               https://github.com/jquery/jquery/issues/2871 */

            if (!e.touches.length)
                return;
            var start = e.touches[0].pageX;
            var $this = $(e.currentTarget);
            $this.on('touchmove', e => {
                var x = e.touches[0].pageX;
                var diff = start - x;
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

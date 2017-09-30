"use strict";

var THRESHOLD = 50;

$(() => {
    log('ontouchstart' in window ?
        'Touch supported' : 'Touch not supported');
    $('.carousel').each((_, carousel) => {
        var $carousel = $(carousel)
        $carousel.on('touchstart', e => {
            if (!e.touches.length)
                return;
            var start = e.touches[0].pageX;
            $carousel.on('touchmove', e => {
                var x = e.touches[0].pageX;
                var diff = start - x;
                if (Math.abs(diff) >= THRESHOLD) {
                    $carousel.off('touchmove');
                    $carousel.carousel(diff > 0 ? 'next' : 'prev');
                }
            });
        });
        $carousel.on('touchcancel', e => {
            $carousel.off('touchmove');
        });
    });
});

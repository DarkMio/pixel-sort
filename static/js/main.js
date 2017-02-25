"use strict";

(function () {

    window.onload = function () {

        var requestAnimFrame = (function () { // fall through for animation frames
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000 / 60);
                };
        })();
        var setImmediate = (function () {
            return window.setImmediate || function (callback) {
                    return window.setTimeout(callback, 0)
                };
        })();

        var config = {
            img: null,
            strength: 0.75,
            threshold: 0.45,
            scale: 1,
            vertical: true,
            running: false
        };

        var constants = (function () {
            var o = { // not so constant, but constant enough
                canvas: document.getElementById('canvas'),
            };

            o['context'] = o.canvas.getContext('2d');
            o['bitmap'] = o.context.getImageData(0, 0, o.canvas.width, o.canvas.height);
            o['data'] = o.bitmap.data;

            Object.defineProperty(o, 'width', {
                get: function () {
                    return o.canvas.width;
                }
            })
            Object.defineProperty(o, 'height', {
                get: function () {
                    return o.canvas.height;
                }
            })
            Object.defineProperty(o, 'config', {
                get: function () {
                    return config;
                }
            })
            Object.defineProperty(config, 'constants', {
                get: function () {
                    return o;
                }
            });
            return o;
        })();

        var setPixel = function (index, r, g, b) {
            /* Maybe this variant >could< be faster. */
            var old_r = constants.data[index];
            var old_g = constants.data[index + 1];
            var old_b = constants.data[index + 2];

            // var old = this.getPixel(index);

            constants.data[index] = old_r + config.strength * (r - old_r);
            constants.data[index + 1] = old_g + config.strength * (g - old_g);
            constants.data[index + 2] = old_b + config.strength * (b - old_b);
        };
        var compare = function (source, target) {
            var oldTotal = constants.data[target] +
                    constants.data[target + 1] +
                    constants.data[target + 2],
                newTotal = constants.data[source] +
                    constants.data[source + 1] +
                    constants.data[source + 2];

            // Which way are we comparing?
            if (config.threshold > 0) {
                return (oldTotal - newTotal) > config.threshold;
            } else {
                return (oldTotal - newTotal) < config.threshold;
            }

            var oldBrightness = constants.data[target] + constants.data[target + 1] + constants.data[target + 2];
            var newBrightness = constants.data[source] + constants.data[source + 1] + constants.data[target + 2];
            var comparison = (oldBrightness - newBrightness) > config.threshold;
            return config.threshold > 0 ? comparison : !comparison;
        };
        var compareAndRecolor = function (source, target) {
            if (!compare(source, target)) {
                return;
            }

            var old_r = constants.data[target];
            var old_g = constants.data[target + 1];
            var old_b = constants.data[target + 2];
            var new_r = constants.data[source];
            var new_g = constants.data[source + 1];
            var new_b = constants.data[source + 2];
            setPixel(target, new_r, new_g, new_b);
            setPixel(source, old_r, old_g, old_b);
        };
        var iterate = function () {
            for (var i = 0; i < config.maxRow; i += config.rWidth) {
                var maxY = i + config.maxColumn;
                for (var j = i; j < maxY; j += 4) {
                    if (config.vertical) {
                        compareAndRecolor(j, j + config.rWidth);
                    } else {
                        compareAndRecolor(j, j + 4);
                    }
                }
            }
            setImmediate(iterate);
        }


        function start() {
            if (config.running) {
                return;
            }

            config.running = true;
            draw();

            iterate();
        }

        function rebuild() {
            config.threshold = Math.floor(Math.pow(config.threshold, 7) * 3 * 255);
            fillImage();
        }

        function draw() {
            console.debug("Draw!")
            requestAnimFrame(draw);
            constants.context.putImageData(constants.bitmap, 0, 0);
        }

        function fillImage(imgUrl) {
            if (imgUrl !== undefined) {
                config.img = imgUrl;
            }
            if (config.img === null) {
                console.error('There should\'ve been an image, but there was none - falling back on default');
                config.img = 'static/img/init.jpg';
            }

            var img = new Image();
            img.src = config.img;
            img.crossOrigin = "Anonymous";
            img.onload = function () {
                constants.canvas.width = this.width;
                constants.canvas.height = this.height;
                constants.context.drawImage(img, 0, 0, constants.width, constants.height);

                var rowWidth = constants.canvas.width * 4;
                var maxRow = config.vertical ? (constants.canvas.height - 1) * rowWidth : constants.canvas.height * rowWidth;
                var maxColumn = config.vertical ? rowWidth : rowWidth - 4;

                config['rWidth'] = rowWidth;
                config['maxRow'] = maxRow;
                config['maxColumn'] = maxColumn;

                constants.bitmap = constants.context.getImageData(0, 0, constants.width, constants.height);
                constants.data = constants.bitmap.data;
                start();
            }
        }

        function buildGUI() {
            var gui = new dat.GUI();
            gui.add(config, 'strength', 0, 1).onFinishChange(alertChange('strength'));
            gui.add(config, 'threshold', 0, 1).onFinishChange(alertChange('threshold'));
            gui.add(config, 'vertical').onFinishChange(alertChange('vertical'));
            return gui;
        }

        /**
         * Currying of the value change alert - this way we can use a single controller serving multiple values
         * (mostly because the API doesn't return which field is named)
         * @param type
         * @returns {Function}
         */
        function alertChange(type) {
            return function (value) {
                console.log("Change of " + type + ": ", value);
                rebuild();
            }
        }

        window.onresize = rebuild;
        fillImage();
        buildGUI();
    };


})();
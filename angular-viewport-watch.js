"use strict";

(function() {
    function viewportWatch(scrollMonitor, $timeout, $parse) {
        var viewportUpdateTimeout;
        function debouncedViewportUpdate() {
            $timeout.cancel(viewportUpdateTimeout);
            viewportUpdateTimeout = $timeout(function() {
                scrollMonitor.update();
            }, 10);
        }

        var link = function(scope, element, attr) {
                if($parse(attr.viewportWatch)(scope) == false){
                    return false;
                }

                if (attr.hashkey !== element.attr('hashkey')) {
                    var unwatch = scope.$watch(function() {
                        return element.attr('hashkey');
                    }, function() {
                        unwatch && unwatch();
                        link.call(this, scope, element, attr);
                    });
                    return true;
                }

                var container = (attr.viewportWatchContainer && attr.viewportWatchContainer.length > 1) ? attr.viewportWatchContainer : undefined;

                var elementWatcher = scrollMonitor.create(element, scope.$eval(attr.viewportWatch || "0"), container);

                function watchDuringDisable() {
                    this.$$watchersBackup = this.$$watchersBackup || [];
                    this.$$watchers = this.$$watchersBackup;
                    var unwatch = this.constructor.prototype.$watch.apply(this, arguments);
                    this.$$watchers = null;
                    return unwatch;
                }
                function toggleWatchers(scope, enable) {
                    var digest, current, next = scope;
                    do {
                        current = next;
                        if (enable) {
                            if (current.hasOwnProperty("$$watchersBackup")) {
                                current.$$watchers = current.$$watchersBackup;
                                delete current.$$watchersBackup;
                                delete current.$watch;
                                digest = !scope.$root.$$phase;
                            }
                        } else {
                            if (!current.hasOwnProperty("$$watchersBackup")) {
                                current.$$watchersBackup = current.$$watchers;
                                current.$$watchers = null;
                                current.$watch = watchDuringDisable;
                            }
                        }
                        next = current.$$childHead;
                        while (!next && current !== scope) {
                            if (current.$$nextSibling) {
                                next = current.$$nextSibling;
                            } else {
                                current = current.$parent;
                            }
                        }
                    } while (next);
                    if (digest) {
                        scope.$digest();
                    }
                }
                function disableDigest() {
                    toggleWatchers(scope, false);
                }
                function enableDigest() {
                    toggleWatchers(scope, true);
                }
                function disableDigestingIfOutsideViewport() {
                    if (!elementWatcher.isInViewport) {
                        disableDigest();
                        debouncedViewportUpdate();
                    }
                }
                scope.$applyAsync(disableDigestingIfOutsideViewport);

                elementWatcher.enterViewport(enableDigest);
                elementWatcher.exitViewport(disableDigest);
                scope.$on("toggleWatchers", function(event, enable) {
                    toggleWatchers(scope, enable);
                });
                scope.$on("$destroy", function() {
                    elementWatcher.destroy();
                    debouncedViewportUpdate();
                });
            };

        return {
            restrict: "AE",
            link: link
        };
    }
    viewportWatch.$inject = [ "scrollMonitor", "$timeout", "$parse" ];
    angular.module("angularViewportWatch", []).directive("viewportWatch", viewportWatch).value("scrollMonitor", window.scrollMonitor);
})();
// formatter.js
sap.ui.define([], function () {
    "use strict";
    return {
        contentAndTypeFormatter: function (sContent) {
            return "Content: " + sContent;
        },
        concatenateText: function(sTag, sName) {
            return sTag + "-" + sName;
        },
        rowHighlightClass: function(sReuse) {
            if (sReuse) {
                return 'grey-text'
            }
            return '';
        },
        getHighlight: function(sContentTypeName, sParentNodeID, sReused) {
            if (sContentTypeName === 'Section' && (sParentNodeID === null || sParentNodeID === 'null')) {
                return 'Indication05';
            }
            return undefined;
        },
        parseTitle: function (sLargeString) {
            if(!sLargeString || sLargeString === null || sLargeString === "null") {
                return "...";
            }

            sLargeString = sLargeString.replace(/<.*?>/g, '');
            sLargeString = sLargeString.replace("&nbsp;", "")

            if(sLargeString.indexOf("data:image/") === 0) {
                return "Image";
            }

            try {
                var oData = JSON.parse(sLargeString);
                return oData.title;
            } catch (e) {
                return sLargeString === "" ? "..." : sLargeString;
            }
        },
        
        parseVertical: function (sLargeString) {
            try {
                var oData = JSON.parse(sLargeString);
                if(oData.vertical)
                    return oData.vertical;
                else
                    return 0;
            } catch (e) {
                return 0;
            }
        },
        
        parseWidth: function (sLargeString) {
            try {
                var oData = JSON.parse(sLargeString);
                return oData.width.join(", ");
            } catch (e) {
                return "";
            }
        },
        
        serializeTitle: function (sTitle, sLargeString) {
            console.log("title changed: ", sTitle, sLargeString)
            try {
                if(sLargeString === null || sLargeString === "" || !sLargeString || sLargeString === undefined) {
                    return '{"title":"' + sTitle + '"}';
                }
                var oData = JSON.parse(sLargeString);
                oData.title = sTitle;
                return JSON.stringify(oData);
            } catch (e) {
                return '{"title":"' + sTitle + '"}';
            }
        },
        
        serializeVertical: function (bVertical, sLargeString) {
            try {
                if(sLargeString === null) {
                    sLargeString = "{}";
                }
                console.log(sLargeString)
                var oData = JSON.parse(sLargeString);
                console.log(oData)
                oData.vertical = bVertical;
                console.log(oData)
                return JSON.stringify(oData);
            } catch (e) {
                return '{"title":"' + sLargeString + '", "vertical": ' + bVertical  + '}';;
            }
        },
        
        serializeWidth: function (sWidth, sLargeString) {
            try {
                if(sLargeString === null) {
                    sLargeString = "{}";
                }
                var oData = JSON.parse(sLargeString);
                oData.width = sWidth.split(",").map(Number);
                return JSON.stringify(oData);
            } catch (e) {
                return sLargeString;
            }
        },

        formatLastUpdate: function(lastUpdate) {
            if (!lastUpdate) {
                return "Never";
            }

            const lastUpdateDate = new Date(lastUpdate);
            const now = new Date();
            const diffInSeconds = Math.floor((now - lastUpdateDate) / 1000);

            const SECONDS_IN_A_MINUTE = 60;
            const SECONDS_IN_AN_HOUR = 3600;
            const SECONDS_IN_A_DAY = 86400;
            const SECONDS_IN_A_WEEK = 604800;
            const SECONDS_IN_A_MONTH = 2592000; // Approximation

            if (diffInSeconds < SECONDS_IN_A_MINUTE) {
                return `${diffInSeconds} seconds ago`;
            } else if (diffInSeconds < SECONDS_IN_AN_HOUR) {
                const minutes = Math.floor(diffInSeconds / SECONDS_IN_A_MINUTE);
                return `${minutes} minutes ago`;
            } else if (diffInSeconds < SECONDS_IN_A_DAY) {
                const hours = Math.floor(diffInSeconds / SECONDS_IN_AN_HOUR);
                return `${hours} hours ago`;
            } else if (diffInSeconds < SECONDS_IN_A_WEEK) {
                const days = Math.floor(diffInSeconds / SECONDS_IN_A_DAY);
                return `${days} days ago`;
            } else if (diffInSeconds < SECONDS_IN_A_MONTH) {
                const weeks = Math.floor(diffInSeconds / SECONDS_IN_A_WEEK);
                return `${weeks} weeks ago`;
            } else {
                return "> 1 month ago";
            }
        },

        parseAutomationResult: function (sLargeString) {
            if(!sLargeString || sLargeString === null || sLargeString === "null") {
                return "Not synced yet";
            }

            if(sLargeString.indexOf("<img") === 0) {
                return "Screenshot was taken";
            }
            else if(/<.*?>/g.test(sLargeString)) {
                sLargeString = sLargeString.replace("&nbsp;", "")
                return sLargeString.replace(/<.*?>/g, '');
            }
            

            try {
                var oData = JSON.parse(sLargeString);
                return oData.title;
            } catch (e) {
                return sLargeString;
            }
        },

        calculateImageWidth: function (sSrc) {
            if(sSrc.indexOf("data:image/") !== 0)
                return "auto";

            // Create a new image element to load the actual image
            var image = new Image();
            image.src = sSrc;

            // Return a promise to handle the async nature of image loading
            return new Promise(function (resolve, reject) {
                image.onload = function () {
                    if (image.width > image.height) {
                        resolve("75%");
                    } else {
                        // Adjust width based on your criteria
                        console.log(image.height, image.width)
                        if (image.height > image.width * 1.5) {
                            resolve("30%");
                        } else {
                            resolve("40%");
                        }
                    }
                };

                image.onerror = function () {
                    reject("auto");
                };
            });
        }
    };
});

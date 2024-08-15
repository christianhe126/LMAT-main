sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/ComboBox",
    "./formatter"
    
], function (Dialog, Button, ComboBox, formatter) {
    "use strict";

    var utility = {};

    utility.base64ToBlob = function (base64, contentType) {
        // Decode Base64 string to binary data
        const byteCharacters = atob(base64);
        const byteArrays = [];

        // Split data into chunks and convert to byte arrays
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        // Create a blob from the byte arrays
        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

    utility.fileToBase64 = function (oFile) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = function (e) {
                var base64String = e.target.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = function (e) {
                reject(e);
            };
            reader.readAsDataURL(oFile);
        });
    },

   utility.arrayBufferToBase64 = function (buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    utility.findInTree = function (entityID, nodes) {
        for (let node of nodes) {
            if (node.entityID === entityID) {
                return node;  // Found the node
            }
            if (node.nodes) {
                let found = this.findInTree(entityID, node.nodes);
                if (found) {
                    return found;  // Node was found in children
                }
            }
        }
        return null;  // Node not found
    }

    utility.findHighestEntityID = function(data) {
        let highest = 0; // Initialize the highest entityID variable
    
        // Define a recursive function to traverse the structure
        function traverse(nodes) {
            nodes.forEach(node => {
                if (node && node.entityID > highest) { // Update highest if current node's entityID is larger
                    highest = node.entityID;
                }
                if (node && node.nodes) { // Recursively traverse if there are nested nodes
                    traverse(node.nodes);
                }
            });
        }
    
        traverse(data); // Start the traversal with the initial data
        return highest;
    }

    utility.openReuseDialog = function (oView) {
        return new Promise((resolve, reject) => {
            var oComboBox = new ComboBox({
                width: "100%",
                items: {
                    path: "myModel>/contents", // Specify the model name here
                    template: new sap.ui.core.ListItem({
                        text: {
                            path: "myModel>source",
                            formatter: formatter.parseTitle
                        }
                    })
                }
            });

            var oDialog = new Dialog({
                title: "Select an Option",
                content: [oComboBox],
                beginButton: new Button({
                    text: "OK",
                    press: function () {
                        var oSelectedItem = oComboBox.getSelectedItem();
                        if (oSelectedItem) {
                            var oContext = oSelectedItem.getBindingContext("myModel");
                            resolve(oContext);
                        } else {
                            reject("No item selected");
                        }
                        oDialog.close();
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        reject("Cancel button pressed");
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oView.addDependent(oDialog);
            oDialog.open();
        });
    }

    utility.getResponseErrorText = function (oError) {
        let sErrorMessage = "Unknown error";
        
        if (oError && oError.responseText) {
            try {
                const oErrorResponse = JSON.parse(oError.responseText);
                if (oErrorResponse.error && oErrorResponse.error.message && oErrorResponse.error.message.value) {
                    sErrorMessage = oErrorResponse.error.message.value;
                } else {
                    sErrorMessage = oError.responseText;
                }
            } catch (e) {
                sErrorMessage = oError.responseText;
            }
        } else if (oError && oError.message) {
            sErrorMessage = oError.message;
        }
    
        return sErrorMessage;
    }
    
    utility.onRefreshTreeTable = function (treeTable) {
        //this.prepareRefreshTreeTable(treeTable);
        treeTable.getBinding("rows").refresh();
    }
    

    utility.prepareRefreshTreeTable = function (treeTable) {
        
        // Capture the current state
        var expandedNodes = [];
        var selectedNodes = treeTable.getSelectedIndices();
        var rows = treeTable.getRows();
    
        for (var i = 0; i < rows.length; i++) {
            var context = rows[i].getBindingContext("myModel");
            if (context && treeTable.isExpanded(i)) {
                expandedNodes.push(context.getPath());
            }
        }
        
        var expandNodes = function() {
            var rows = treeTable.getRows();
            var allExpanded = true;
            rows.forEach(function(row, index) {
                var context = row.getBindingContext("myModel");
                if (context && expandedNodes.includes(context.getPath())) {
                    try {
                        treeTable.expand(index);
                    } catch (error) {
                        console.error("Error expanding node at index " + index + ": " + error.message);
                        allExpanded = false;
                    }
                }
            });
    
            // Re-apply sorting
            //treeTable.getBinding("rows").sort(sorter);
    
            if (!allExpanded) {
                // Retry if not all nodes could be expanded
                setTimeout(this.expandNodes, 100);
            }
            else {
                treeTable.getRows().forEach(row => row.getDomRef().style.visibility = "visible");
                for (var i = 0; i < selectedNodes.length; i++) {
                    treeTable.addSelectionInterval(selectedNodes[i], selectedNodes[i]);
                }
            }
        }

        treeTable.getRows().forEach(row => row.getDomRef().style.visibility = "hidden");
        treeTable.getBinding("rows").attachEventOnce("dataReceived", function() {
            setTimeout(expandNodes, 100);
        });
    }



    return utility;
});

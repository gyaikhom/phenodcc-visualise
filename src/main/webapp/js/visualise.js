/* 
 * Copyright 2013-2015 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global d3 */

/**
 * 
 * Written by: Gagarine Yaikhom (g.yaikhom@har.mrc.ac.uk)
 */
(function () {
    /* this is the global variable where we expose the public interfaces */
    if (typeof dcc === 'undefined')
        dcc = {};

    /* semantic version (set from pom.xml) */
    dcc.version = 'DCC_VISUALISE_VERSION';

    /* format for conversion between datetime */
    dcc.dateTimeFormat = d3.time.format('%Y-%m-%d %H:%M:%S');
    dcc.dateFormat = d3.time.format('%e %B %Y, %A');

    /* object that handles image visualisation */
    dcc.imageViewer = null;

    var
        /* Phenoview operates in two modes:
         * 
         * 1. Visualisation mode
         *    In this mode, the actual visualisation is displayed to the user.
         *    This uses the genes and parameters list discussed below.
         *
         * 2. Configuration mode
         *    This mode allows a user to configure the selection of genes and
         *    parameters. The selection made here affects what is displayed
         *    in the visualisation mode.
         */
        VISUALISE = 'Visualise',
        CONFIGURE = 'Configure',
        mode = VISUALISE, /* by default, choose visualisation mode */
        fullConfigHasBeenLoaded = false, /* has the full config been loaded */
        dateConfigDataExpires = null, /* last time configuration data was loaded */
        MILLISECONDS_TO_EXPIRATION = 7200000, /* 2 hours */
        /* reference to body */
        body = d3.select('body'),
        /* comparative visualisation allows comparison between multiple genes
         * for a selection of parameters. The following list all of the
         * centres, genes, procedures and parameters that are available for
         * selection. Since these values do not change very often, they are
         * loaded when the application is loaded to reduce latency.
         * 
         * @TODO:
         * Furture versions should periodically update this information
         * asynchronously behind the scene. */
        centres, centreActivity, genes, procedures, parameters,
        /* map for available genes and parameters */
        availableGenesMap = {}, availableParametersMap = {},
        /* maps parameter identifier to parameter key */
        parameterIdToKeyMap = {},
        /* map and count of selected genes and parameters */
        selectedGenesMap = {}, selectedGenesCount = 0,
        selectedParametersMap = {}, selectedParametersCount = 0,
        /* from the list above, we select genes and parameters that are use by
         * the comparative visualiation mode. These selections are maintained
         * as a doubly-linked list. */
        geneList, parameterList,
        /* map to retrieve centre details from centre id */
        centresMap,
        /* map to retrieve procedure details from procedure key */
        procedureKeyToProcedureDetailsMap = {},
        /* colour dictionary for procedure cell */
        procedureColour = {},
        /* associated media parameter for gene and measurements */
        associatedMedia = {},
        /* list can be displayed as a simple list or a detailed list */
        isSimpleList = false,
        /* some constants that allows configuration of the tool */
        FLOAT_DISPLAY_PRECISION = 5,
        PARAMETER_KEY_FIELD = 'e',
        PARAMETER_NAME_FIELD = 'n',
        PROCEDURE_ID_FIELD = 'p',
        STR_IMAGE = 'image',
        /* hyphenated concatenation of genotype, strain and centre ids */
        GENE_KEY = 'gsc',
        /* property names for sorting genes list */
        SORT_BY_GENE_ALLELE = 'alleleName',
        SORT_BY_GENE_STRAIN = 'strain',
        SORT_BY_GENE_CENTRE = 'cid',
        /* property names for sorting parameter list */
        SORT_BY_PARAMETER_KEY = PARAMETER_KEY_FIELD,
        SORT_BY_PARAMETER_NAME = 'n',
        SORT_BY_PROCEDURE_NAME = 'pn',
        /* default property name to use when sorting */
        sortedBy,
        /* we allow filtering of displayed list */
        filterBy,
        /* regular expression for retrieving procedure key */
        REGEX_PROC_KEY = /[A-Z]*_([A-Z]*)_[0-9]*_[0-9]*/,
        REGEX_ALLELE = /[^<>]*<sup>(.*)<\/sup>/,
        /* list of items on the navigator panel */
        navigatorItems,
        isDraggingInProgress = false, /* true when list items are being dragged */
        draggedKey = null, /* uniquely identifies the item being dragged */
        dragDropIndex = -1, /* where to drop the item to finish dragging */
        currentDragOverRow = null, /* item list row where mouse is current on */
        previousDragOverRow = null, /* row before entering current row */
        DRAG_MARKER = 'drag-drop-marker', /* how highlighting drop suggestion */

        /* All of the visualisations are displayed using a two dimensional
         * grid where the columns represent the selected genes, and the rows
         * represent the selected parameters. This is referred to as the
         * visualiation cluster, and is managed under the following DOM node */
        visualisationCluster = null,
        /* All of the visualisations are interactive. The user has the facility
         * to enable or disable several features (e.g., show/hide statistics).
         * All of these settings are controlled using a bitmap. The following
         * lists all of the possible settings that are available through the
         * controls panel. */
        controlOptions,
        DEFAULT_VISUALISATION_SETTING = 3144161,
        /* When a user hovers over a data point, further information concerning
         * the data point is displayed using a popup box. The following
         * implements the popup box. We use one popup box that is shared by
         * all of the visualisations. */
        informationBox, /* object that points to the information box */
        informationBoxOffset = 15, /* pixel displacement from mouse pointer */
        informationBoxWidth,
        informationBoxHeight,
        /* available zooming options */
        ZOOM_SMALL = 600,
        ZOOM_MEDIUM = 800,
        ZOOM_LARGE = 1000,
        ZOOM_XLARGE = 1200,
        /* The width of a visualisation determines the dimensions of all the
         * visualisations. This values changes according to the scale:
         *     S - Small
         *     M - Medium
         *     L - Large
         *    XL - Extra large
         * 
         * selectable from the controls panel. From this width, the height is
         * calculated to match the required aspect ratio. */
        visualisationWidth = ZOOM_SMALL, /* in pixels */
        VISUALISATION_ASPECT_RATIO = 1.77,
        /* In addition to the visualiation, users have the option to display
         * the related annotations. The following contains the annotation map */
        annotations = {},
        /* When displaying annotations, we extend the visualisation while
         * keeping the visualisation width constant. */
        heightExtension = 0, /* extension in addition to aspect height */
        HEIGHT_EXTENSION_VALUE = 200, /* if extended, how far */

        /* If animating interfaces, how long should it last */
        ANIMATION_DURATION = 200,
        /* How long to delay event action, say scrolling, takes effect */
        EVENT_THROTTLE_DELAY = 200,
        /* Throttle activation of search box keyup event handler */
        SEARCH_THROTTLE_DELAY = 200,
        /* The annotations panel displays ontology terms for annotations with
         * statistical p-values that are above a certain threshold. The
         * following is the default threshold used. This can be changed
         * dynamically by passing a value using URL query name 'pt'. */
        DEFAULT_PVALUE_THRESHOLD = 0.0001,
        /* Using the controls panel, a user can filter out data points from the
         * visualisation based on their zygosity. The following list the
         * possible filters available */
        ZYGOSITY_ALL = 0, /* display all */
        ZYGOSITY_HET = 1, /* only heterozygous */
        ZYGOSITY_HOM = 2, /* only homozygous */
        ZYGOSITY_HEM = 3, /* only hemizygous */
        zygosity = ZYGOSITY_ALL, /* by default, do not filter by zygosity */

        /* When a visualisation becomes visible, an AJAX call retrieves the
         * required measurements. After measurements have been retrieved, all of
         * the statistical calculations are carried out. These calculated values
         * are then cached for future use. The following contains the cached
         * results, which contains measurements and statistics for het, hom,
         * hem and all respectively. */
        measurementsSet = [{}, {}, {}, {}],
        /* For every visualisation, we also display its QC status. The following
         * is a map of QC statuses for gene-parameter combinations*/
        qcstatus = {},
        /* keeps record of when measurements were last updated */
        lastUpdate = {},
        /* For every visualisation, we provide the facility to display
         * measurements that belongs to a specific meta-data group. We store in
         * the following all of the unique meta-data group values. */
        metadataGroups = {},
        /* we detect touch devises to allow touch-based interactions */
        isSupportedTouchDevice = navigator.userAgent.match(/Android|iPhone|iPad/i),
        /* touch events */
        TOUCH_START = 'touchstart',
        /* radius of data points in pixels at different zoom levels */
        WILDTYPE_DATAPOINT_RADIUS_SCALE,
        wildtypeDatapointRadius,
        MUTANT_DATAPOINT_RADIUS_SCALE,
        mutantDatapointRadius,
        /* radius of data points for statistics display */
        STAT_DATAPOINT_RADIUS = 3,
        highlightedSpecimen = -1, /* current highlighted specimen */
        /* Beeswarm data points are not allowed to go outside this bound
         * on both sides relative to the principal swarm axis */
        SWARM_BOUND = 70,
        /* We use the options array for assigning colour to category legends.
         * The following map stores the latest colour index. The colour
         * index is derived from parameter options (see processParameters). */
        categoryColourIndex,
        /* we keep a count of the number of categories. First one for
         * highlighted data-point/column category, which appears in all
         * categorical displays. */
        numCategories = 1,
        /* details panel works in three modes */
        detailsPanel = null,
        CENTRE_DETAILS = 1,
        PROCEDURES_AND_PARAMS_WITH_DATA = 2,
        PROCEDURE_DETAILS = 3,
        /* minimum screen width required for displaying procedure or parameter
         * tails on the procedure/parameter list */
        MIN_SCREEN_WIDTH_FOR_DETAILS = 1440,
        procedureColour = {}, /* background colours for procedure icons */
        /* We display an annotations heatmap. This is an independent web-app
         * which is embedded inside Phenoview. The web-app comes from the
         * phenodcc-heatmap project that is hosted on the same server as
         * Phenoview. The following contains a heatmap instance. */
        heatmap = null,
        /* Stores the state before visualisation preview. When user clicks
         * on a heatmap cell, they are taken to the visualisation preview.
         * We use the following to remember where to go back. Previews are
         * available from the configuration mode, hence, we need to remember
         * the state of the configuration mode. */
        stateToReturnTo = 'heatmap',
        /* When user clicks on a gene from the available genes list, we want
         * to remember which gene the user was looking at so that we can
         * display the corresponding visualisation preview upon return. */
        geneShowingDetails = null,
        /* When we are previewing visualisations from centre gene list, we
         * wish to return to the gene list for the selected centre. In the
         * following, we remember which centre the user was looking at when
         * the preview was launched. Within the centre, we will then highlight
         * the gene using the previous state variable. */
        centreShowingDetails = null,
        /* finally, the procedure the user was looking at */
        procedureShowingDetails = null,
        /* following are used for list paging when there are too many rows */
        LIST_PAGE_SIZE = 100,
        listCurrentPage = 0,
        listLastPage = 0,
        /* used for handling small screen */
        SMALL_SCREEN_WIDTH = 900,
        /* to enable or disable display of information box */
        informationBoxIsDisabled = false
        ;

    filterBy = {
        'centre': null, /* filter genes by centre */
        'procedure': null, /* filter parameters by procedure */
        'text': null /* filter genes and parameters by free text */
    };

    sortedBy = {
        'genes': SORT_BY_GENE_ALLELE,
        'parameters': SORT_BY_PARAMETER_NAME,
        'geneList': SORT_BY_GENE_ALLELE,
        'parameterList': SORT_BY_PARAMETER_NAME
    };

    categoryColourIndex = {
        'Highlighted specimen': 0
    };


    MUTANT_DATAPOINT_RADIUS_SCALE = {
        '600': 1.5,
        '800': 2.3,
        '1000': 2.7,
        '1200': 3
    };

    WILDTYPE_DATAPOINT_RADIUS_SCALE = {
        '600': 1.25,
        '800': 1.7,
        '1000': 2.0,
        '1200': 2.3
    };

    controlOptions = {
        'mean': 0x1, /* show arithmetic mean */
        'median': 1 << 1, /* show median */
        'max': 1 << 2, /* show maximum values */
        'min': 1 << 3, /* show minimum values */
        'quartile': 1 << 4, /* show first and third quartiles */
        'female': 1 << 5, /* include female specimens */
        'male': 1 << 6, /* include male specimens */
        'point': 1 << 7, /* show data points */
        'polyline': 1 << 8, /* show polylines */
        'errorbar': 1 << 9, /* show error bar (by default standard deviation) */
        'crosshair': 1 << 10, /* show crosshair */
        'wildtype': 1 << 11, /* include wild type specimens */
        'whisker': 1 << 12, /* show box and whisker */
        'whisker_iqr': 1 << 13, /* extend whiskers to 1.5 IQR */
        'infobar': 1 << 14, /* show information about the visualisation */
        'statistics': 1 << 15, /* show descriptive statistics */
        'swarm': 1 << 16, /* show beeswarm plot */
        'hom': 1 << 17, /* include homozygotes */
        'het': 1 << 18, /* include heterozygotes */
        'hem': 1 << 19, /* include hemizygotes */
        'std_err': 1 << 20, /* show standard error for error bars */
        'overview': 1 << 21, /* show overview visualisations */
        'shapes': 1 << 22 /* use shapes to display data points */
    };

    navigatorItems = [
        {
            'title': 'browse available',
            'id': 'browse-list',
            'items': [
                {
                    'label': 'Heatmap',
                    'id': 'heatmap',
                    'hint': 'Browse by statistical analysis results',
                    'fn': function (parent) {
                        resetStateBeforePreview();
                        showHeatmap(parent);
                    }
                },
                {
                    'label': 'Centre',
                    'id': 'centre',
                    'hint': 'Browse genes by phenotyping centre',
                    'fn': function (parent) {
                        resetStateBeforePreview();
                        listCurrentPage = 0;
                        showCentres(parent);
                    }
                },
                {
                    'label': 'Gene',
                    'id': 'gene',
                    'hint': 'Browse or search all of the available genes',
                    'fn': function (parent) {
                        resetStateBeforePreview();
                        showGenes(parent);
                    }
                },
                {
                    'label': 'Procedure',
                    'id': 'procedure',
                    'hint': 'Browse parameters associated with a procedure',
                    'fn': function (parent) {
                        resetStateBeforePreview();
                        listCurrentPage = 0;
                        showProcedures(parent);
                    }
                },
                {
                    'label': 'Parameter',
                    'id': 'parameter',
                    'hint': 'Browse or search all of the parameters',
                    'fn': function (parent) {
                        resetStateBeforePreview();
                        listCurrentPage = 0;
                        showParameters(parent);
                    }
                }
            ]
        },
        {
            'title': 'current selections',
            'id': 'comparison-list',
            'items': [
                {
                    'label': 'Genes',
                    'id': 'genes-basket',
                    'hint': 'View and edit the current selection of genes',
                    'fn': function (parent) {
                        resetStateBeforePreview();
                        listCurrentPage = 0;
                        showSelectedGenes(parent);
                    }
                },
                {
                    'label': 'Parameters',
                    'id': 'parameters-basket',
                    'hint': 'View and edit the current selection of parameters',
                    'fn': function (parent) {
                        resetStateBeforePreview();
                        listCurrentPage = 0;
                        showSelectedParameters(parent);
                    }
                }
            ]
        }
    ];

    dcc.visualisationControl = DEFAULT_VISUALISATION_SETTING;

    /**
     * We use cookies for remembering user settings, what they were looking at
     * etc. between sessions.
     * 
     * @param {type} cookieName Name of the cookie.
     * @param {type} cookieValue Value to store.
     * @param {type} daysToExpiry When should the cookied expire (in days).
     */
    function setCookie(cookieName, cookieValue, daysToExpiry) {
        var date = new Date();
        date.setTime(date.getTime() + (daysToExpiry * 24 * 60 * 60 * 1000));
        var expires = "expires=" + date.toUTCString();
        document.cookie = cookieName + "=" + (cookieValue ? cookieValue : '') +
            "; " + expires;
    }

    /**
     * Retrieves name/value pairs stored during the last session.
     * 
     * @param {type} cookieName Name of the cookie.
     * @returns {Object} Cookie value if it exists; otherwise, undefined.
     */
    function getCookie(cookieName) {
        var name = cookieName + "=";
        var cookiesArray = document.cookie.split(';');
        for (var i = 0; i < cookiesArray.length; i++) {
            var cookie = cookiesArray[i];
            while (cookie.charAt(0) === ' ')
                cookie = cookie.substring(1);
            if (cookie.indexOf(name) === 0)
                return cookie.substring(name.length, cookie.length);
        }
        return undefined;
    }

    /**
     * Sometimes we wish to reset the web-app by forgetting everything the
     * browser remembers from the last session. The following resets the web-app
     * to the default setting, and forgets all that is remembered.
     */
    function resetState() {
        stateToReturnTo = 'heatmap';
        centreShowingDetails = null;
        setCookie('centre', centreShowingDetails);
        geneShowingDetails = null;
        setCookie('gene', geneShowingDetails);
        procedureShowingDetails = null;
        setCookie('procedure', procedureShowingDetails);
        setCookie('gene_searched', undefined);
        setCookie('param_searched', undefined);
        setCookie('only_significant', undefined);
        setCookie('selected_centres', undefined);
        dcc.pvalueThreshold = DEFAULT_PVALUE_THRESHOLD;
        setCookie('pvalue_threshold', dcc.pvalueThreshold);
    }

    /**
     * This prevents the preview from interfering with the normal visualisation.
     */
    function resetStateBeforePreview() {
        d3.selectAll('#navigator li').classed('navigator-selected', false);
        geneShowingDetails = centreShowingDetails =
            procedureShowingDetails = null;
        setCookie('centre', centreShowingDetails);
        setCookie('gene', geneShowingDetails);
        setCookie('procedure', procedureShowingDetails);
    }

    /**
     * Saves current gene and parameter selections for future sessions.
     */
    function saveSelectionAsCookies() {
        setCookie("genes", getGeneList());
        setCookie("parameters", getParameterList());
    }

    /**
     * Removes all white spaces from beginning and end. This extends the
     * String prototype.
     *
     * @description
     * Steven Levithan has made a comparison of various implementations.
     *
     * http://blog.stevenlevithan.com/archives/faster-trim-javascript
     */
    String.prototype.trim = function () {
        return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    /**
     * Makes the first character of the string uppercase.
     */
    String.prototype.icap = function () {
        return this.substr(0, 1).toUpperCase() + this.substr(1);
    };

    /**
     * Returns a substring of the string object after discarding characters
     * from either the start, or the end.
     *
     * <p>If the supplied number of characters to be discarded is
     * less than 0, they are discarded at the end; otherwise, they are
     * discarded from the start of the string. <i>The original string is
     * left unmodified.</i></p>
     *
     * @param {Integer} nchars Number of characters to discard.
     *
     * @return {String} A substring with the remaining characters.
     */
    String.prototype.discard = function (nchars) {
        var length = this.length - nchars;
        return nchars < 0 ? this.substr(0, length)
            : this.substr(nchars, length);
    };

    /**
     * Returns a comparator. This method can generate comparators for
     * either one or two fields.
     * 
     * @param {String} p First field to compare with.
     * @param {String} q Second field to compare after first comparison.
     * @returns {Function} Comparator function.
     */
    function getComparator(p, q) {
        return function (a, b) {
            if (a[p] === b[p]) {
                if (q === undefined)
                    return 0;
                else {
                    if (a[q] === b[q])
                        return 0;
                    if (a[q] < b[q])
                        return -1;
                    return 1;
                }
            }
            if (a[p] < b[p])
                return -1;
            return 1;
        };
    }

    /**
     * Converts floating-point value to required precision. If value is
     * supplied as a string, we first convert the value to a float.
     * 
     * @param {Float|String} value Float value.
     * @returns {Float} Float value with the required precision.
     */
    function toDisplayPrecision(value) {
        if (typeof value === 'string')
            value = parseFloat(value);
        return value.toFixed(FLOAT_DISPLAY_PRECISION);
    }

    /**
     * Adds milliseconds to a date.
     * 
     * @param {Date} date Date object.
     * @param {Integer} milliseconds Number of milliseconds to add.
     * @returns {Date} New date.
     */
    function addMillisecondstoDate(date, milliseconds) {
        return new Date(date.getTime() + milliseconds);
    }

    /**
     * Adds days to a date.
     * 
     * @param {Date} date Date object.
     * @param {Integer} days Number of days to add.
     * @returns {Date} New date.
     */
    function addDaysToDate(date, days) {
        return addMillisecondstoDate(date, days * 86400000);
    }

    /**
     * Prevent event from bubbling to parent DOM nodes.
     */
    function preventEventBubbling() {
        var event = d3.event;
        if (!event)
            return;
        if (event.preventDefault)
            event.preventDefault();
        if (event.stopPropagation)
            event.stopPropagation();
        event.cancelBubble = true;
        return false;
    }

    /**
     * Returns the number of milliseconds it takes to execute a function.
     *
     * @param {Function} f Function to execute.
     */
    function timedExec(f) {
        var start = new Date().getTime();
        f();
        return new Date().getTime() - start;
    }

    /**
     * Delays execution of an event handler.
     * 
     * @param {Function} method Event handler.
     * @param {Integer} delay Delay in milliseconds before invoking handler.
     * @param {Object} thisArg The object to use as this inside the handler.
     */
    function throttle(method, delay, thisArg) {
        clearTimeout(method.throttleTimeout);
        method.throttleTimeout =
            setTimeout(function () {
                method.apply(thisArg);
            }, delay);
    }

    /**
     * Returns visulisation beight to satisfy required aspect ratio.
     * 
     * @param {Integer} width The width of the visualisation.
     * @returns {Integer} Visualisation height.
     */
    function getAspectHeight(width) {
        return width / VISUALISATION_ASPECT_RATIO;
    }

    /**
     * Returns a d3js linear scale for numerical data.
     *
     * @param {Real} domainLow Lowest value for the domain.
     * @param {Real} domainHigh highest value for the domain.
     * @param {Real} rangeLow Highest value for range.
     * @param {Real} rangeHigh Highest value for range.
     *
     * @return {Function} A scaling function that maps values from
     *         domain to range.
     */
    function getLinearScaler(domainLow, domainHigh, rangeLow, rangeHigh) {
        return d3.scale.linear()
            .domain([domainLow, domainHigh])
            .range([rangeLow, rangeHigh]);
    }

    /**
     * Returns a d3js time scale for data/time.
     *
     * @param {Real} domainLow Lowest value for the domain.
     * @param {Real} domainHigh highest value for the domain.
     * @param {Real} rangeLow Highest value for range.
     * @param {Real} rangeHigh Highest value for range.
     *
     * @return {Function} A scaling function that maps values from
     *         domain to range.
     */
    function getTemporalScaler(domainLow, domainHigh, rangeLow, rangeHigh) {
        return d3.time.scale()
            .domain([domainLow, domainHigh])
            .range([rangeLow, rangeHigh]);
    }

    /**
     * Appens a 'div' node with DOM identifier 'id' and class 'cls' as
     * a child under parent DOM node 'parent;.
     * 
     * @param {Object} parent Parent DOM node.
     * @param {String} id Identifier to use for child.
     * @param {String} cls Class to apply to child.
     * @param {String} text Text to put inside div.
     * @returns {Object} Child DOM node.
     */
    function addDiv(parent, id, cls, text) {
        var node = parent.append('div');
        if (id)
            node.attr('id', id);
        if (cls)
            node.attr('class', cls);
        if (text)
            node.text(text);
        return node;
    }

    /**
     * Appends a link anchor to the parent DOM node 'parent' that has the
     * hyper-reference 'href', DOM identifier 'id' and anchor text 'text'.
     * 
     * @param {Object} parent
     * @param {String} href
     * @param {String} text
     * @param {String} id
     */
    function addLink(parent, href, text, id) {
        parent.append('a')
            .attr('href', href)
            .text(text);
        if (id)
            parent.attr('id', id);
    }

    /**
     * Displays a DOM node using fade-in animation.
     * 
     * @param {Object} node DOM node to display.
     * @param {Integer} duration Animation duration.
     * @returns {undefined}
     */
    function show(node, duration) {
        if (node)
            node.transition()
                .duration(duration === undefined ? 0 : duration)
                .style('opacity', 1);
    }

    /**
     * Removes a DOM node after a fade-out animation.
     * 
     * @param {Object} node DOM node to display.
     * @param {Integer} duration Animation duration.
     * @returns {undefined}
     */
    function hideAndDestroy(node, duration) {
        if (node)
            node.transition()
                .duration(duration === undefined ? 0 : duration)
                .style('opacity', 0)
                .each('end', function () {
                    node.remove();
                });
    }

    /**
     * Clears DOM node by recursively removing all of the children node.
     * 
     * @param {Object} node Parent DOM node.
     */
    function clear(node) {
        node.selectAll('*').remove();
    }

    /**
     * Returns the current height of the DOM node.
     * 
     * @param {Object} node DOM node.
     * @param {Integer} value New height.
     * @returns {Integer} Height of the DOM node.
     */
    function height(node, value) {
        if (typeof node === 'string')
            node = d3.select(node);
        if (node.empty())
            return undefined;
        if (value !== undefined)
            node.style('height', value + 'px');
        return node.node().getBoundingClientRect().height;
    }

    /**
     * Returns the current width of the DOM node.
     * 
     * @param {Object} node DOM node.
     * @param {Integer} value New height.
     * @returns {Integer} width of the DOM node.
     */
    function width(node, value) {
        if (typeof node === 'string')
            node = d3.select(node);
        if (value !== undefined) {
            node.style('width', value + 'px');
        }
        return node.node().getBoundingClientRect().width;
    }

    /**
     * Returns the specified dimension for the supplied DOM element node.
     *
     * <p>We use the rendered dimension information available in
     * the DOM's style property. Only dimensions that can be measured using
     * pixel units are permitted as dimension type.</p>
     *
     * @param {Object} dom A DOM element node that has been selected with D3.
     * @param {String} type The type of the dimension required.
     *
     * @return {Integer|null} The height of the DOM node, or null if invalid
     *         dimension type.
     */
    function getNodeDimension(dom, type) {
        var value = null;
        switch (type) {
            case 'height':
            case 'width':
                /* remove 'px' suffix before integer parse */
                value = parseInt(dom.style(type).discard(-2), 10);
                break;
            default:
        }
        return value;
    }

    /**
     * Appends a table row.
     * 
     * @param {Object} table Parent table DOM node.
     * @param {String} cls Class to use for the table row.
     * @returns {Object} Row node.
     */
    function addRow(table, cls) {
        return table.append('tr').attr('class', cls);
    }

    /**
     * Appends column nodes to a row node.
     * 
     * @param {Object} row Table row DOM node.
     * @param {String} text Column contents.
     * @param {String} link If the column should have a hyper-refrence anchor.
     */
    function addColumn(row, text, link) {
        var td = row.append('td');
        if (link) {
            td.append('a').attr('href', link).text(text);
        } else {
            if (text)
                td.text(text);
        }
        return td;
    }

    /**
     * Updates the progress notification by changing the current processing
     * phase and percentage completion.
     * 
     * @param {Integer} percentage Percentage completed.
     * @param {String} message Current processing phase.
     */
    function progress(percentage, message) {
        d3.select('#loading-progress-bar').style('width', percentage + '%');
        d3.select('#loading-message').text(message);
    }

    /**
     * Sets up the web application loading notification.
     * 
     * @param {Object} node DOM node that will contain the content to load.
     */
    function loadingApp(node) {
        clear(node);
        var loading = addDiv(node, 'loading-app');
        addDiv(loading, 'loading-icon');
        addDiv(addDiv(loading, 'loading-progress'), 'loading-progress-bar');
        addDiv(loading, 'loading-message');
    }

    /**
     * The selected genes are displayed as column headers in the visualisation
     * cluster. We refer to this horizontal bar as the 'infobar'. Since the
     * infobar must be placed relative to the visualisations, they are
     * scrolls whenever a user scrolls the visualisation cluster.
     * 
     * @param {Object} event The scrolling event.
     */
    function scrollInfobar(event) {
        var infobar = d3.select('#infobar'),
            window = d3.select('#cluster');
        infobar.node().scrollLeft = window.node().scrollLeft;
    }

    /* Display credits information */
    dcc.credits = function () {
        alert("P H E N O V I E W\n" +
            "(Version " + dcc.version + ")\n\n" +
            "The International Mouse Phenotyping Consortium\n" +
            "(http://www.mousephenotype.org/)\n\n" +
            "Web app designed and implemented by Gagarine Yaikhom\n" +
            "Medical Research Council Harwell\n\n" +
            "Uses backend systems developed by the PhenoDCC team."
            );
    };

    /**
     * Prepares the data-of-birth for display.
     *
     * @param {String} dob Date of birth value from server.
     * @returns {String} Valid date-of-birth information.
     */
    function prepareDateOfBirth(dob) {
        if (dob === null || dob.length === 0) {
            dob = "Unknown value";
        } else {
            try {
                dob = dcc.dateFormat(new Date(dob));
            } catch (e) {
                dob = "Invalid value";
            }
        }
        return dob;
    }

    /**
     * Prepares the sex of the specimen for display.
     *
     * @param {String} sex Sex of the specimen from server.
     * @returns {String} Valid sex information.
     */
    function prepareSex(sex) {
        if (sex === null || sex.length === 0) {
            sex = "Invalid";
        } else {
            if (sex.length === 1) {
                try {
                    switch (parseInt(sex)) {
                        case 0:
                            sex = "Female";
                            break;
                        case 1:
                            sex = "Male";
                            break;
                        default:
                            sex = "Invalid";
                    }
                } catch (e) {
                    sex = "Invalid";
                }
            } else {
                sex = "Invalid";
            }
        }
        return sex;
    }

    /**
     * Returns true if male; otherwise, false.
     * 
     * @param {Object} datapoint Data point object.
     * @returns {Boolean} True if male; otherwise, female.
     */
    function isMaleDatapoint(datapoint) {
        return datapoint.s === 1;
    }

    /**
     * Prepares the zygosity of the specimen for display.
     *
     * @param {Integer} zygosity Zygosity of the specimen from server.
     * @returns {String} Valid zygosity information.
     */
    function prepareZygosity(zygosity) {
        if (zygosity === undefined) {
            zygosity = "Invalid";
        } else {
            switch (zygosity) {
                case 0:
                    zygosity = "Heterozygous";
                    break;
                case 1:
                    zygosity = "Homozygous";
                    break;
                case 2:
                    zygosity = "Hemizygous";
                    break;
                default:
                    zygosity = "Invalid";
            }
        }
        return zygosity;
    }

    /**
     * Prepares specimen litter information for display.
     *
     * @param {String} litter Litter information from server.
     * @returns {String} Valid litter information.
     */
    function prepareLitter(litter) {
        if (litter === null || litter.length === 0) {
            litter = "Unknown value";
        }
        return litter;
    }

    /**
     * Prepares specimen name for display.
     *
     * @param {String} name Specimen name from server.
     * @returns {String} Valid specimen name.
     */
    function prepareSpecimenName(name) {
        if (name === null || name.length === 0) {
            name = "Unknown value";
        }
        return name;
    }

    /**
     * Prepares the data point 'on hover' information.
     *
     * @param {Object} data Specimen data.
     * @param {Object} datapoint Contsins measurement id and animal id,
     *     which is retrieved from the visualisation.
     * @param {Object} ptype Plot type.
     */
    function prepareInfo(data, datapoint, ptype) {
        if (data === null)
            return "<h3>Server did not return valid data</h3>";

        var dob = prepareDateOfBirth(data.dob),
            animalName = prepareSpecimenName(data.animalName),
            litter = prepareLitter(data.litter), x,
            info = '<hr><ul><li><b>Name:</b> ' + animalName + '</li>' +
            '<li><b>DOB:</b> ' + dob + '</li>' +
            '<li><b>Litter:</b> ' + litter + '</li>' + '</ul>';

        if (ptype.t === 'nominal') {
            info = '<b>Category:</b> ' + datapoint.v + '</br>' + info;
        } else {
            x = datapoint.x;
            if (ptype.xt === 'd') {
                if (typeof x !== 'Date')
                    x = new Date(x);
                x = dcc.dateFormat(x);
            }
            info = '<b>X:</b> ' + x + '<br><b>Y:</b> ' + datapoint.y + info;
        }

        return info;
    }

    /**
     * Hides the information box pop-up.
     */
    function hideInformationBox() {
        informationBox.style('display', 'none');
    }

    /**
     * All of the visualisations share the same information box. This box is
     * initialised to be hidden when the web app starts.
     */
    function createInformationBox() {
        if (informationBox === undefined) {
            informationBox = addDiv(body, 'datapoint-infobox');
            informationBox.style('display', 'none')
                .on('mouseover',
                    function () {
                        preventEventBubbling();
                        hideInformationBox();
                    });
            informationBoxWidth =
                getNodeDimension(informationBox, 'width')
                + informationBoxOffset;
            informationBoxHeight =
                getNodeDimension(informationBox, 'height')
                + informationBoxOffset;
        }
    }

    /**
     * Relocates the information box which contains the data point details
     * relative to the current mouse pointer position.
     *
     * @param {Object} bmc Bounded mouse coordinates and bounding region.
     */
    function relocateInformationBox(bmc) {
        if (informationBoxIsDisabled) {
            informationBox.style('display', 'none');
            return;
        } else {
            informationBox.style('display', 'block');
        }


        var x = bmc.boundedCoordX, y = bmc.boundedCoordY,
            hx = bmc.rangeHighX, ly = bmc.rangeLowY;

        /* the label is positioned relative to the crosshair center.
         * the pointer crosshair divides the visualisation into four
         * quadrants. if possible, we should always show the label
         * inside the 4th quadrant (since it is easier to read the
         * label as we move the crosshair). However, if the label
         * cannot be displayed in full, we must choose an
         * alternative quadrant to display the information */
        x = x + informationBoxWidth > hx ?
            x - informationBoxWidth - informationBoxOffset :
            x + informationBoxOffset;
        y = y + informationBoxHeight > ly ?
            y - informationBoxHeight - informationBoxOffset :
            y + informationBoxOffset;

        /* move the information box to new position */
        informationBox
            .style('left', (x + bmc.originX) + 'px')
            .style('top', (y + bmc.originY) + 'px');
    }

    /**
     * Calculates the quartile value for the given data set. We first calculate
     * the quartile interval for the integral values, and then do a linear
     * interpolation with the fractional part.
     *
     * @param {Integer} whichQuartile first, second or third.
     * @param {[Number | Object]} dataset Dataset of one-dimensional numerical
     *         values, or two-dimensional objects. In the later case, the column
     *         must be specified.
     * @param {String} column For two-dimensional data set, which column
     *         represents the measured dataset.
     *
     * @returns The quartile value.
     */
    function calculateQuartile(whichQuartile, dataset, column) {
        var k = (whichQuartile * 0.25 * (dataset.length - 1)) + 1,
            truncated = Math.floor(k),
            fractional = k - truncated,
            /* indexing begins at 0 */
            low = dataset[truncated - 1],
            high = dataset[truncated];

        /* if two-dimensional, retrieve column value */
        if (column) {
            low = low[column];
            high = high[column];
        }
        return low + (fractional * (high - low)); /* lerp */
    }

    /**
     * Returns the 1st and 3rd quartile indices inside a sorted data set
     * with the supplied number of items.
     *
     * <p>Since the <i>median</i> is the second quartile, and has already been
     * calculated elsewhere, we do not calculate it here.</p>
     *
     * @param {[Number]} data Sorted data set.
     * @param {String} column For two-dimensional data set, which column
     *         represents the measured dataset.
     *
     * @return {Object} An object that contains two properties, <b>q1</b> and
     *      <b>q3</b>, which are indeed indices inside the sorted data set.
     *      These indices, respectively, point to the first and third quartiles.
     */
    function getFirstAndThirdQuartiles(data, column) {
        return {
            'q1': calculateQuartile(1, data, column),
            'q3': calculateQuartile(3, data, column)
        };
    }

    /**
     * Retrieves the 1st quartile
     * 
     * @param {Object} d Datapoint.
     */
    function getQ1(d) {
        return {
            m: d.m,
            a: d.a,
            x: d.k,
            y: d.s.quartile === null ? null : d.s.quartile.q1
        };
    }

    /**
     * Retrieves the 3rd quartile
     * 
     * @param {Object} d Datapoint.
     */
    function getQ3(d) {
        return {
            m: d.m,
            a: d.a,
            x: d.k,
            y: d.s.quartile === null ? null : d.s.quartile.q3
        };
    }

    /**
     * Calculates descriptive statistics for a specific column in the supplied
     * two-dimensional data set. In contrast to the function
     * <b>calculateRowStatistics()</b>, it is imperative that <i>all rows
     * must have the same size</i>.
     *
     * <p>This implementation combines several algorithms and reuses common
     * values that have already been calculated by previous steps, thus
     * avoiding redundant loops.</p>
     *
     * @param {Object[]} dataset A one-dimensional array with data points.
     * @param {String | Integer} column The column to process. This can either
     *        be a column index (starting at 0), or an attribute name.
     * @param {Function | null} comparator A comparator function that takes
     *        two values <b>a</b> and <b>b</b>, and the column index, or
     *        attribute, <b>c</b> and returns <b>0</b> if <b>a[c] = b[c]</b>,
     *        <b>1</b> if <b>a[c] > b[c]</b>, or <b>-1</b> otherwise.
     *        If <b>comparator = null</b>, the supplied array is already sorted.
     *
     * @return {Object} An object that contains the statistical information.
     */
    function calculateColumnStatistics(dataset, column, comparator) {
        var statistics = null, size; /* statistics and number of data points */

        if (dataset && dataset instanceof Array) {
            size = dataset.length;

            /* sum of values, maximum, minimum, mean, median,
             * population standard deviation, and quartile object */
            var sum, max, min, mean, median,
                standardDeviation, standardError, quartile,
                distanceFromMean, isOdd,
                t, i; /* temp variable and counter */

            sum = max = min = mean = median = 0;

            if (size > 0) {
                dataset.sort(comparator);

                max = min = sum = t = dataset[0][column];
                for (i = 1; i < size; ++i) {
                    t = dataset[i][column];
                    if (t > max)
                        max = t;
                    if (t < min)
                        min = t;
                    sum += t;
                }
                /* we now have maximum, minimum and sum of values */

                mean = sum / size;

                for (i = distanceFromMean = t = 0; i < size; ++i) {
                    distanceFromMean = dataset[i][column] - mean;
                    t += Math.pow(distanceFromMean, 2);
                }

                standardDeviation = Math.sqrt(t / (size - 1));
                standardError = standardDeviation / Math.sqrt(size);

                /* calculate median */
                i = Math.floor(size * 0.5); /* find middle, or left of middle */
                isOdd = size & 1; /* is the number of data points odd? */

                /* we must make index adjustments since array indexing begins
                 * at 0. when the number of data points is odd, median has
                 * already been index adjusted due to flooring */
                median = isOdd ? dataset[i][column]
                    : (dataset[i][column] + dataset[i - 1][column]) * 0.5;

                /* calculate quartiles: requires a minimum of 2 data-points */
                quartile = size > 1 ?
                    getFirstAndThirdQuartiles(dataset, column) : null;

                statistics = {
                    'sum': sum,
                    'max': max,
                    'min': min,
                    'mean': mean,
                    'median': median,
                    'sd': standardDeviation,
                    'se': standardError,
                    'quartile': quartile
                };
            }
        }
        return statistics;
    }

    /**
     * Returns a comparator function which takes a column property/index.
     *
     * @param {String | Integer} k Property to use as primary sorting key.
     * @param {String | Integer} j Property to use as secondary sorting key.
     *
     * @returns {Function | null} comparator A comparator function that takes
     *        two values <b>a</b> and <b>b</b>, and the column index, or
     *        attribute, <b>c</b> and returns <b>0</b> if <b>a[c] = b[c]</b>,
     *        <b>1</b> if <b>a[c] > b[c]</b>, or <b>-1</b> otherwise.
     *        If <b>comparator = null</b>, the supplied array is already sorted.
     */
    function getAttributeValueComparator(k, j) {
        return function (a, b) {
            return a[k] === b[k] ?
                (j === undefined ? 0 : (a[j] === b[j] ? 0 : a[j] > b[j] ? 1 : -1)) :
                a[k] > b[k] ? 1 : -1;
        };
    }

    /**
     * Groups measured items into series points using a key, and calculates
     * the group statistics for each of the series.
     *
     * @param {Object[]} dataset The data set, which is a one-dimensional array
     *      of objects with numerical data.
     * @param {String | Integer} keyColumn The column property/index inside a
     *      data-point to use as key for grouping.
     * @param {String | Integer} xColumn The column property/index that gives
     *      the x-value.
     * @param {String | Integer} yColumn The column property/index that gives
     *      the y-value.
     * @param {String | Integer} metadataGroupColumn The column property/index
     *      that gives the unique metadata group.
     * @param {String | Integer} animalIdColumn The column property/index
     *      that gives the unique animal identifier.
     * @param {String | Integer} measurementIdColumn The column property/index
     *      that gives the unique measurement identifier.
     * @param {String} target Statistics property to target.
     *
     * @return Object that contains statistical information. The structure of
     *     this object is as follows:
     *
     *     [
     *         { k, c, d, s: {max, min, sum, mean, median, sd, quartile}},
     *         { k, c, d, s: {max, min, sum, mean, median, sd, quartile}},
     *            . . . // one stat object for each row in the data set
     *     ]
     *
     *     where, for each grouped data
     *
     *     k: the group key,
     *     c: number of items in the group
     *     d: group data as coordinate pairs (x, y) where y is the value
     *     max: maximum y-value
     *     min: minimum y-value
     *     sum: sum of the y-values
     *     mean: mean of the y-value
     *     median: median of the y-values
     *     sd: standard deviation of the y-values
     *     quartile: 1st and 2nd quartile points for the y-values
     */
    function calculateGroupedSeriesStatistics(dataset, keyColumn,
        xColumn, yColumn, metadataGroupColumn,
        animalIdColumn, measurementIdColumn, target) {
        var s = {
            i: {}
        },
        currentKey, currentGroupKey, currentKeyGroup = [],
            currentMeasuredValueX, currentMeasuredValueY,
            i, size, xValueComparator, yValueComparator;

        s[target] = [];

        /* sort data in ascending value of key for efficient grouping */
        dataset.sort(getAttributeValueComparator(keyColumn));

        i = 1;
        size = dataset.length;

        /* first key value defines the first group */
        currentKey = currentGroupKey = dataset[0][keyColumn];

        xValueComparator = getAttributeValueComparator(xColumn);
        yValueComparator = getAttributeValueComparator(yColumn);

        /* a key-to-index table for rapid reference */
        s.i[currentGroupKey] = 0;

        /* start group with the first measured value */
        currentKeyGroup.push({
            e: dataset[0][metadataGroupColumn],
            m: dataset[0][measurementIdColumn],
            a: dataset[0][animalIdColumn],
            x: dataset[0][xColumn],
            y: dataset[0][yColumn],
            s: dataset[0].s /* sex */
        });

        while (i < size) {
            currentKey = dataset[i][keyColumn];
            currentMeasuredValueX = dataset[i][xColumn];
            currentMeasuredValueY = dataset[i][yColumn];
            if (currentKey === currentGroupKey)
                /* still the same group; value joins group */
                currentKeyGroup.push({
                    e: dataset[i][metadataGroupColumn],
                    m: dataset[i][measurementIdColumn],
                    a: dataset[i][animalIdColumn],
                    x: currentMeasuredValueX,
                    y: currentMeasuredValueY,
                    s: dataset[i].s, /* sex */
                    z: dataset[i].z /* zygosity */
                });
            else {
                /* no longer the same group! calculate statistical data
                 * for the current group and store the row statistics. Since
                 * we want to use the group points for series plotting against
                 * the x-values, they must be sorted by the x-values */
                s[target].push({
                    k: currentGroupKey,
                    c: currentKeyGroup.length,
                    s: calculateColumnStatistics(currentKeyGroup, 'y',
                        yValueComparator),
                    d: currentKeyGroup.sort(xValueComparator)
                });

                /* we must start a new group. the current key value defines
                 * the new group; and the only member is its measured value */
                s.i[currentKey] = s.i[currentGroupKey] + 1;
                currentGroupKey = currentKey;
                currentKeyGroup = [{
                        e: dataset[i][metadataGroupColumn],
                        m: dataset[i][measurementIdColumn],
                        a: dataset[i][animalIdColumn],
                        x: currentMeasuredValueX,
                        y: currentMeasuredValueY,
                        s: dataset[i].s, /* sex */
                        z: dataset[i].z /* zygosity */
                    }];
            }
            ++i;
        }

        /* calculate statistics for the unprocessed group */
        if (currentKeyGroup.length > 0) {
            s[target].push({
                k: currentKey,
                c: currentKeyGroup.length,
                s: calculateColumnStatistics(currentKeyGroup, 'y',
                    yValueComparator),
                d: currentKeyGroup.sort(xValueComparator)
            });
        }

        return s;
    }

    /**
     * Accepts a one-dimensional array of measurements and calculates the
     * various statistics required, while also preparing the data for plotting.
     *
     * @param {Object} dataset The data set, which is a one-dimensional array
     *     of objects.
     * @param {String | Integer} keyColumn The column property/index inside a
     *      data-point to use as key for grouping.
     * @param {String | Integer} xColumn The column property/index that gives
     *      the x-value.
     * @param {String | Integer} yColumn The column property/index that gives
     *      the y-value.
     * @param {String | Integer} metadataGroupColumn The column property/index
     *      that gives the unique metadata group.
     * @param {String | Integer} animalIdColumn The column property/index
     *      that gives the unique animal identifier.
     * @param {String | Integer} measurementIdColumn The column property/index
     *      that gives the unique measurement identifier.
     *
     * @return An object that contains various statistics and the data in
     *         the appropriate format required for plotting. The returned
     *         object has the following structure:
     *
     *         {
     *             c: { // group by x-values
     *                 i:, // x-value-to-group statistics object index
     *                 c: [ // group statistics when grouped using x-value
     *                 {
     *                     k: group key: which is the x-value
     *                     c: group size
     *                     d: [ y1, y2, . . . ] // y-values with same x-value
     *                     s: {
     *                         min:
     *                         max:
     *                         sum:
     *                         mean:
     *                         median:
     *                         sd:
     *                         quartile: {
     *                             q1:
     *                             q3:
     *                         }
     *                     }
     *                 },
     *                 . . . // one object for every unique x-value
     *                 ]
     *             },
     *             o: { // overall statistics
     *                 x: { // limited statistics for the x-value
     *                     min:
     *                     max:
     *                 },
     *                 y { // full statistics for the y-value
     *                     min:
     *                     max:
     *                     sum:
     *                     mean:
     *                     median:
     *                     sd:
     *                     quartile: {
     *                         q1:
     *                         q3:
     *                     }
     *                 }
     *             },
     *             r: { // group by animal Id
     *                 i:, // animalId-to-group statistics object index
     *                 r: [ // group statistics when grouped using animalId
     *                 {
     *                     k: group key: which is the animal Id
     *                     c: group size
     *                     d: [ y1, y2, . . . ] // y-values with same x-value
     *                     s: {
     *                         min:
     *                         max:
     *                         sum:
     *                         mean:
     *                         median:
     *                         sd:
     *                         quartile: {
     *                             q1:
     *                             q3:
     *                         }
     *                     }
     *                 },
     *                 . . . // one object for every unique animal Id
     *                 ]
     *             }
     *         }
     *
     */
    function prepareDatasetForPlotting(dataset, keyColumn, xColumn,
        yColumn, metadataGroupColumn, animalIdColumn, measurementIdColumn) {

        if (!dataset || dataset.length < 1)
            return null;

        /* the statistics and formatted data */
        var s = {
            'overall': {}, /* overall statistics: all for y, min/max for x */
            c: {}, /* column statistics where data is grouped by x-values */
            r: {} /* row statistics where data is grouped by animal id */
        }; /* temp variables */

        /* we first calculate the overall statistics for the y-values. Since
         * calculation of the median and quartiles require sorting the entire
         * data-set using the 'y' value, we have to do this separately. */
        s.overall.y = calculateColumnStatistics(dataset, yColumn,
            getAttributeValueComparator(yColumn));

        /* next, we find the column statistics of the data where the
         * measurements are grouped by their x-values */
        s.c = calculateGroupedSeriesStatistics(dataset, xColumn, xColumn,
            yColumn, metadataGroupColumn, animalIdColumn,
            measurementIdColumn, 'c');

        /* next, we find the row statistics of the data where the
         * measurements are grouped by their animal identifiers. This also
         * prepares the required data-set for series plotting against
         * animal identifier. */
        s.r = calculateGroupedSeriesStatistics(dataset, keyColumn, xColumn,
            yColumn, metadataGroupColumn, animalIdColumn,
            measurementIdColumn, 'r');

        /* finally, we derive the minimum and maximum x-values required for
         * generating the x-axis and scales. We use the column statistics
         * because the measurements have already been grouped by x-values
         * and these have already been sorted (due to the grouping). We could
         * have calculated the overall statistics for the x-values, however,
         * since only min and max are required, it will be an overkill */
        s.overall.x = {};
        s.overall.x.min = s.c.c[0].k; /* key of first column statistics */
        s.overall.x.max = s.c.c[s.c.c.length - 1].k; /* key of last column */

        return s;
    }

    /**
     * Calculates all of the descriptive statistics separated by gender.
     *
     * @param {Object} dataset The data set, which is a one-dimensional array
     *     of objects that contain both gender.
     * @param {String | Integer} keyColumn The column property/index inside a
     *      data-point to use as key for grouping.
     * @param {String | Integer} xColumn The column property/index that gives
     *      the x-value.
     * @param {String | Integer} yColumn The column property/index that gives
     *      the y-value.
     * @param {String | Integer} metadataGroupColumn The column property/index
     *      that gives the unique metadata group.
     * @param {String | Integer} animalIdColumn The column property/index
     *      that gives the unique animal identifier.
     * @param {String | Integer} measurementIdColumn The column property/index
     *      that gives the unique measurement identifier.
     */
    function calculateStatistics(dataset, keyColumn, xColumn,
        yColumn, metadataGroupColumn, animalIdColumn, measurementIdColumn) {
        if (!dataset)
            return null;
        var i, c, datapoint, maleData = [], femaleData = [];
        for (i = 0, c = dataset.length; i < c; ++i) {
            datapoint = dataset[i];
            if (datapoint.s)
                maleData.push(datapoint);
            else
                femaleData.push(datapoint);
        }
        return {
            'genderCombined': prepareDatasetForPlotting(dataset, keyColumn,
                xColumn, yColumn, metadataGroupColumn, animalIdColumn,
                measurementIdColumn),
            'male': prepareDatasetForPlotting(maleData, keyColumn, xColumn,
                yColumn, metadataGroupColumn, animalIdColumn,
                measurementIdColumn),
            'female': prepareDatasetForPlotting(femaleData, keyColumn, xColumn,
                yColumn, metadataGroupColumn, animalIdColumn,
                measurementIdColumn)
        };
    }

    /**
     * Returns the correct statistics object depending on the control setting.
     *
     * @param {Object} viz Th visualisation object.
     * @param {Boolean} forMutant If true, return mutant statistics,
     *         otherwise, return wild type statistics.
     */
    function getStatistics(viz, forMutant) {
        var statistics = null, temp = forMutant ?
            viz.state.mutantStatistics : viz.state.wildtypeStatistics;
        if (temp) {
            var showMale = viz.isActiveCtrl('male'),
                showFemale = viz.isActiveCtrl('female');
            statistics = showMale ?
                (showFemale ? temp.genderCombined : temp.male) :
                (showFemale ? temp.female : null);
        }
        return statistics;
    }

    /**
     * Returns the overall baseline statistics for combined male and female.
     * 
     * @param {Object} stat Statistics object.
     * @param {Integer} gid Genotype identifier.
     * @returns {Object} Overall statistics.
     */
    function getOverallBaselineStatisticsBothGenders(stat, gid) {
        var overall = undefined;
        if (stat) {
            if (stat.genderCombined) {
                stat = stat.genderCombined;
                if (stat.overall) {
                    overall = stat.overall;
                } else {
                    if (gid !== 0)
                        console.warn('No overall wild type statistics for combined gender...');
                }
            } else {
                if (gid !== 0)
                    console.warn('No wild type statistics for combined gender...');
            }
        } else {
            if (gid !== 0)
                console.warn('No wild type statistics...');
        }
        return overall;
    }

    /**
     * Creates a frequency grid.
     *
     * @param {Integer} row Number of rows in the grid.
     * @param {Integer} col Number of columns in the grid.
     *
     * @returns {Array} Two-dimensional array frequency grid.
     */
    function createFrequencyGrid(row, col) {
        var i, j, freqGrid = [];
        for (i = 0; i < row; ++i) {
            freqGrid[i] = [];
            for (j = 0; j < col; ++j)
                freqGrid[i][j] = {
                    'm': {}, /* mutant frequency */
                    'b': {} /* wild type/control frequency */
                };
        }
        return freqGrid;
    }

    /**
     * Prints the frequency grid.
     *
     * @param {Array} freqGrid Two-dimensional frequency grid.
     */
    function printFrequencyGrid(freqGrid) {
        var i, j;
        for (i = 0; i < 5; ++i)
            for (j = 0; j < 4; ++j)
                console.log(freqGrid[i][j]);
    }

    /**
     * Increments grid frequency for wild type or mutant.
     *
     * @param {Array} freqGrid Two-dimensional frequency grid.
     * @param {Integer} row Grid row.
     * @param {Integer} col Grid column.
     * @param {Integer} category Measured category.
     * @param {String} type Type of datum (wild type, or mutant).
     */
    function incrementCellFrequency(freqGrid, row, col, category, type) {
        var cell = freqGrid[row][col][type];
        if (cell[category] === undefined)
            cell[category] = 1; /* first specimen under this category */
        else
            cell[category] += 1;
    }

    /**
     * Processes a measurement datum. This will increment the
     * appropriate frequencies in the grid.
     *
     * @param {Array} freqGrid Two-dimensional frequency grid.
     * @param {Object} datum Measured categorical datum.
     */
    function processCategoricalDatum(freqGrid, datum) {
        /* genotype = 0 means wild type datum */
        var type = datum.g === 0 ? 'b' : 'm', value = datum.v;

        incrementCellFrequency(freqGrid, 4, 3, value, type);
        incrementCellFrequency(freqGrid, datum.s, datum.z, value, type);
        incrementCellFrequency(freqGrid, 4, datum.z, value, type);
        incrementCellFrequency(freqGrid, datum.s, 3, value, type);
    }

    /**
     * Calculates option percentages for wild type or mutant in a cell.
     *
     * @param {Object} freq Object with category frequencies.
     *
     * @returns {Object} An object with category percentages.
     */
    function calculateFrequencyPercentages(freq) {
        var statistics = {}, total = 0, option;

        /* calculate total */
        for (option in freq)
            total += freq[option];

        /* calculate percentage */
        for (option in freq)
            statistics[option] = (freq[option] * 100.0) / total;

        return {
            't': total,
            's': statistics
        };
    }

    /**
     * Calculates the option percentages for each of the cells. These
     * percentages are then displayed as segment bars.
     *
     * @param {Array} freqGrid Two-dimensional frequency grid.
     */
    function calculateCategoryPercentages(freqGrid) {
        var i, j, freq;
        for (i = 0, j; i < 5; ++i) {
            for (j = 0; j < 4; ++j) {
                freq = freqGrid[i][j];
                freqGrid[i][j].wildtypeStatistics =
                    calculateFrequencyPercentages(freq.b);
                freqGrid[i][j].mutantStatistics =
                    calculateFrequencyPercentages(freq.m);
            }
        }
    }

    /**
     * Process categorical data into gender/zygosity grid.
     *
     * @param {[Object]} dataset Datatset with categorical measurements.
     * @returns Returns the frequency and percentage grid for wild type/mutant
     *         and combinations of gender and zygosity. Using this grid, we can
     *         answer questions such as:
     *
     *         o What percentage of male specimens have option X?
     *         o What percentage of the wild type male homozygous specimens have
     *           option X?
     *         o What percentage of the wild type specimens have option X?
     *         
     *         Also returns a list of unique categories used in visualisation.
     *         This is used when displaying category legends.
     */
    function processCategorical(dataset) {
        /* the following grid data structure captures frequencies for each of
         * the gender, zygosity and mutant combinations.
         *
         *                  Het    Hom     Hem    All
         *        Female  (0, 0)  (0, 1)  (0,2)  (0, 3)
         *          Male  (1, 0)  (1, 1)  (1,2)  (1, 3)
         *      Intersex  (2, 0)  (2, 1)  (2,2)  (2, 3)
         *       No data  (3, 0)  (3, 1)  (3,2)  (3, 3)
         *           All  (4, 0)  (4, 1)  (4,2)  (4, 3)
         *
         * And for each cell, we collect the wild type (b) and mutant (m)
         * counts for each of the parameter options.
         */
        var freqGrid = createFrequencyGrid(5, 4), datum,
            category, categoriesInUse = {}, categories = [];
        for (var i = 0, c = dataset.length; i < c; ++i) {
            datum = dataset[i];
            processCategoricalDatum(freqGrid, datum);

            /* if categorial data is free-form without a set of options
             * specified in IMPReSS, we should assigned indexes based on
             * the values received. */
            category = datum.v;
            if (categoryColourIndex[category] === undefined)
                categoryColourIndex[category] = numCategories++;
            /* get list of unique categories used in this visulisation */
            if (categoriesInUse[category] === undefined) {
                categoriesInUse[category] = 1;
                categories.push(category);
            }
        }
        calculateCategoryPercentages(freqGrid);
        categories.sort(function (a, b) {
            return a.localeCompare(b);
        });
        categories.unshift('Highlighted specimen');
        return {
            'freqGrid': freqGrid,
            'categories': categories
        };
    }

    /**
     * Renders a circle.
     *
     * @param {Object} svg SVG node to attach circle element to.
     * @param {Integer} cx x-coordinate of the center.
     * @param {Integer} cy y-coordinate of the center.
     * @param {Integer} radius Radius of the circle.
     * @param {String} cls Class to use for the circle.
     */
    function circle(svg, cx, cy, radius, cls) {
        return svg.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', radius)
            .attr('class', cls);
    }

    /**
     * Renders a square.
     *
     * @param {Object} svg SVG node to attach circle element to.
     * @param {Integer} cx x-coordinate of the center of the square.
     * @param {Integer} cy y-coordinate of the center of the square.
     * @param {Integer} side Length of a side.
     * @param {String} cls Class to use for the circle.
     */
    function square(svg, cx, cy, side, cls) {
        var halfSide = side * 0.5;
        return svg.append('rect')
            .attr('x', cx - halfSide)
            .attr('y', cy + halfSide)
            .attr('width', side)
            .attr('height', side)
            .attr('class', cls);
    }

    /**
     * Renders a line segment
     *
     * @param {Object} svg SVG node to attach line element to.
     * @param {Integer} x1 x-coordinate of segment start.
     * @param {Integer} y1 y-coordinate of segment start.
     * @param {Integer} x2 x-coordinate of segment end.
     * @param {Integer} y2 y-coordinate of segment end.
     * @param {String} cls Class to use for the line segment.
     */
    function line(svg, x1, y1, x2, y2, cls) {
        return svg.append('line')
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('class', cls);
    }

    /**
     * Renders a rectangle.
     *
     * @param {Object} svg SVG node to attach rectangular element to.
     * @param {Integer} x x-coordinate of top-left.
     * @param {Integer} y y-coordinate of top-left.
     * @param {Integer} width  Width of the rectangular element.
     * @param {Integer} height Height of the rectangular element.
     * @param {String} cls Class to use for the rectangular element.
     */
    function rect(svg, x, y, width, height, cls) {
        return svg.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('height', height)
            .attr('width', width)
            .attr('class', cls);
    }

    /**
     * Renders a text.
     *
     * @param {Object} svg SVG node to attach text element to.
     * @param {Integer} x x-coordinate of the text.
     * @param {Integer} y y-coordinate of the text.
     * @param {String} text The text to display.
     * @param {String} cls Class to use for the text segment.
     */
    function text(svg, x, y, text, cls) {
        return svg.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('class', cls)
            .text(text);
    }

    /**
     * Draws an error bar (off one standard deviation) for a given data point.
     *
     * @param {String} id Identifier to use for the error bar group.
     * @param {Object} viz The visualisation object.
     * @param {Real} x Value of property <b>x</b> for the data point.
     * @param {Real} y Value of property <b>x</b> for the data point.
     * @param {Real} deviation Deviation from data point.
     * @param {Integer} width Width of the error bar in pixels.
     *
     * @return {Object} The modified DOM element.
     */
    function plotErrorBar(id, viz, x, y, deviation, width) {
        var errorBarRootDom, /* groups all error bar components */
            svg = viz.state.n.s, visualisationScale = viz.scale,
            xScale = visualisationScale.x, yScale = visualisationScale.y,
            halfWidth = width * 0.5, /* half width: get bar offset from point */
            bottomLeftX, bottomLeftY, /* scaled bottom-left corner */
            topRightX, topRightY; /* scaled top-right corner */

        /* remove existing whisker plot group with the identifier */
        svg.selectAll('.ebar.' + id).remove();

        /* append a new series plot group */
        errorBarRootDom = svg.append('g').attr('class', 'ebar ' + id);

        /* calculate SVG screen coordinates for the vertical line and the
         * bottom-left and top-right corners */
        x = xScale(x);
        bottomLeftX = x - halfWidth;
        topRightX = x + halfWidth;

        bottomLeftY = yScale(y - deviation);
        topRightY = yScale(y + deviation);

        /* vertical line */
        line(errorBarRootDom, x, bottomLeftY, x, topRightY, 'v');

        /* min (low) */
        line(errorBarRootDom, bottomLeftX, bottomLeftY,
            topRightX, bottomLeftY, 'l');

        /* max (high) */
        line(errorBarRootDom, bottomLeftX, topRightY,
            topRightX, topRightY, 'h');
    }

    /**
     * Converts statistics for display on pop-up.
     * @param {type} stat
     * @returns {String}
     */
    function convertStatisticsToTable(stat) {
        var m = '<table><tbody>';
        m += '<tr><td>Mean:</td><td>' + toDisplayPrecision(stat.mean) + '</td></tr>';
        m += '<tr><td>Median:</td><td>' + toDisplayPrecision(stat.median) + '</td></tr>';
        if (stat.quartile) {
            m += '<tr><td>1st quartile:</td><td>' + toDisplayPrecision(stat.quartile.q1) + '</td></tr>';
            m += '<tr><td>3rd quartile:</td><td>' + toDisplayPrecision(stat.quartile.q3) + '</td></tr>';
        }
        m += '<tr><td>Minimum:</td><td>' + toDisplayPrecision(stat.min) + '</td></tr>';
        m += '<tr><td>Maximum:</td><td>' + toDisplayPrecision(stat.max) + '</td></tr>';
        if (stat.sd)
            m += '<tr><td>Std. deviation:</td><td>' + toDisplayPrecision(stat.sd) + '</td></tr>';
        if (stat.se)
            m += '<tr><td>Std. error:</td><td>' + toDisplayPrecision(stat.se) + '</td></tr>';
        return m + '</tbody></table>';
    }

    /**
     * Returns a generic event handler that is activated when the mouse
     * enters a statistics display.
     * 
     * @param {Object} viz The visualisation object.
     * @param {String} message Message to display.
     * @param {String} type TYpe of statistics (wildtype/mutant).
     * 
     * @returns {Function} An event handler.
     */
    function getStatisticsOnMouseEnterHandler(viz, message, type) {
        return function () {
            preventEventBubbling();
            relocateInformationBox(getBoundedMouseCoordinate(viz));
            informationBox.html(message)
                .attr('class', 'infobar-stat-' + type);
        };
    }

    /**
     * Draws a whisker plot using the supplied statistical information.
     *
     * <p>To avoid overlapping the data points (if they are visible)
     * with the whisker plots, we displace the whisker plots to the
     * right of the data points.</p>
     *
     * @param {String} id Identifier to user for the whisker plot group.
     * @param {Object} viz The visualisatin object.
     * @param {Object} statistics The statistical information to use for plot.
     * @param {Real} groupKey Value used as the group key when calculating
     *        the supplied statistics.
     * @param {Integer} displacement Padding in pixels to use as displacement
     *        to the right of the x-value of the data point that is
     *        associated with the whisker plot.
     * @param {Integer} width Width of the whisker plot in pixels.
     * @param {String} cls The class to use for display style.
     *
     * @return {Object} The modified DOM element.
     */
    function plotBoxAndWhisker(id, viz, statistics, groupKey,
        displacement, width, cls) {
        var svg = viz.state.n.s, quartiles = statistics.quartile, onMouseover;

        if (!quartiles)
            return svg;

        var whiskerRootDom, visualisationScale = viz.scale,
            xScale = visualisationScale.x, yScale = visualisationScale.y,
            interQuartileRange, whiskerHeight, bottomLeftY, topRightY,
            halfWidth, bottomLeftX, topRightX, t, bottom, top;

        /* calculate y-coordinates of horizontal whiskers */
        if (viz.isActiveCtrl('whisker_iqr')) {
            interQuartileRange = quartiles.q3 - quartiles.q1;
            whiskerHeight = interQuartileRange * 1.5;
            bottomLeftY = yScale(quartiles.q1 - whiskerHeight);
            topRightY = yScale(quartiles.q3 + whiskerHeight);

            /* don't extend whiskers further than the extremas */
            bottom = yScale(statistics.min);
            top = yScale(statistics.max);
            if (bottom < bottomLeftY)
                bottomLeftY = bottom;
            if (top > topRightY)
                topRightY = top;
        } else {
            bottomLeftY = yScale(statistics.min);
            topRightY = yScale(statistics.max);
        }

        onMouseover = getStatisticsOnMouseEnterHandler(viz,
            convertStatisticsToTable(statistics), cls);

        /* remove existing whisker plot group with the identifier */
        svg.select('.whisker.' + cls + '.' + id).remove();

        /* append a new series plot group */
        whiskerRootDom = svg.append('g').attr('class',
            'whisker ' + id + ' ' + cls)
            .on('mouseenter', onMouseover)
            .on('mouseleave', function () {
                hideInformationBox();
            });

        /* screen x-coordinate of population giving the statistics */
        groupKey = xScale(groupKey);

        halfWidth = width * 0.5; /* half of box width */
        bottomLeftX = groupKey + displacement - halfWidth;
        topRightX = bottomLeftX + width;

        /* vertical line */
        t = bottomLeftX + halfWidth;
        line(whiskerRootDom, t, bottomLeftY, t, topRightY, 'v');

        /* +1.5 IQR */
        line(whiskerRootDom, bottomLeftX, bottomLeftY,
            topRightX, bottomLeftY, 'l');

        /* -1.5 IQR */
        line(whiskerRootDom, bottomLeftX, topRightY,
            topRightX, topRightY, 'h');

        /* box */
        t = yScale(quartiles.q3);
        rect(whiskerRootDom, bottomLeftX, t,
            width, yScale(quartiles.q1) - t);

        /* median */
        t = yScale(statistics.median);
        line(whiskerRootDom, bottomLeftX, t, topRightX, t, 'm');

        return svg;
    }

    /**
     * Draws a labelled horizontal line segment at the specified height.
     *
     * @param {Object} svg The parent D3 selected DOM element to render to.
     * @param {Integer} y Screen y-coordinate of the line.
     * @param {Integer} left Screen x-coordinate of the left end.
     * @param {Integer} right Screen x-coordinate of the right end.
     * @param {String} label Text to display as label.
     * @param {Integer} labelX Screen x-coordinate of label.
     * @param {Integer} labelY Screen y-coordinate of label.
     * @param {String} lineClass Class to use for the line.
     *
     * @return {Object} The modified DOM element.
     */
    function plotHorizontalLine(svg, y, left, right,
        label, labelX, labelY, lineClass) {
        var lineRootDom = svg.append('g').attr('class', lineClass);

        line(lineRootDom, left, y, right, y);

        /* should we show label? */
        if (label !== null && label.length > 0)
            text(lineRootDom, labelX, labelY, label);

        return svg;
    }

    /**
     * Draws an axis with line, ticks and label.
     *
     * <p>We assume that all of the parameters are valid (i.e., we do not check
     * if they are null or undefined.</p>
     *
     * @param {String} id Identifier to user for the whisker plot group.
     * @param {Object} viz The visualisation object.
     * @param {String} orientation Axis orientation (top, right, bottom, left).
     * @param {String} label Text to use as axis label.
     *
     * @return {Object} The modified DOM element.
     */
    function plotAxis(id, viz, orientation, label) {
        var svg = viz.state.n.v;
        /* remove existing axis with the identifier */
        svg.select('.' + id + '-axis').remove();

        /* if orientation is not provided, it means remove the axis */
        if (orientation === null)
            return viz;

        var axis = {},
            paddingFromRootDom = viz.dim.p,
            dim = viz.chart.dim, domHeight = dim.h, domWidth = dim.w,
            visualisationScale = viz.scale,
            xScale = visualisationScale.x, yScale = visualisationScale.y,
            halfPadding = paddingFromRootDom * 0.5,
            quarterPadding = halfPadding * 0.5,
            threeQuarterPadding = halfPadding + quarterPadding,
            valueRange,
            labelRotationAngle = 0, labelX, labelY,
            axisBoxTopLeftX, axisBoxTopLeftY;

        switch (orientation) {
            case 'bottom':
            case 'top':
                valueRange = xScale.range();
                axisBoxTopLeftX = 0;
                labelX = axisBoxTopLeftX + domWidth * 0.5;

                if (orientation[0] === 't') {
                    axisBoxTopLeftY = threeQuarterPadding;
                    labelY = axisBoxTopLeftY - (halfPadding + quarterPadding);
                } else {
                    axisBoxTopLeftY = domHeight - threeQuarterPadding;
                    labelY = axisBoxTopLeftY + halfPadding;
                }

                /* reusing variable valueRange */
                valueRange = d3.svg.axis()
                    .scale(xScale)
                    .orient(orientation);

                /* if the x-axis values are integral, format ticks as such */
                if (viz.ptype.xt === 'i') {
                    valueRange.tickFormat(d3.format("r"))
                        .tickValues(Object.keys(viz.state.mutantStatistics.genderCombined.c.i));
                }

                break;

            case 'right':
            case 'left':
                valueRange = yScale.range();
                axisBoxTopLeftY = 0;
                labelY = domHeight * 0.5;
                if (orientation[0] === 'r') {
                    axisBoxTopLeftX = domWidth - threeQuarterPadding;
                    labelX = domWidth - (halfPadding + quarterPadding);
                    labelRotationAngle = 90;
                } else {
                    axisBoxTopLeftX = threeQuarterPadding;
                    labelX = quarterPadding;
                    labelRotationAngle = -90;
                }

                /* reusing variable valueRange */
                valueRange = d3.svg.axis().scale(yScale).orient(orientation);
        }

        /* append a new axis root */
        axis[id] = {};

        /* reusing variable domHeight */
        domHeight = svg.append('g').attr('class', id + '-axis');

        /* append line, ticks and values */
        axis.tick = domHeight.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(' +
                axisBoxTopLeftX + ',' + axisBoxTopLeftY + ')')
            .call(valueRange);

        /* append label */
        axis.label = domHeight.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('transform', 'rotate(' +
                labelRotationAngle + ',' + labelX + ',' + labelY + ' ' + ')')
            .text(label);

        axis.root = domHeight;
        viz.state.n.a[id] = axis;

        return svg;
    }

    /**
     * Draws the overall statistical information for the entire data set.
     *
     * @param {Object} viz The visualisation object.
     * @param {Object} statistics The statistical information to use for plot.
     * @param {Integer} [padding] Label padding (pixels) from line right-end.
     * @param {Boolean} isBaseline Is the plot for wild type data?
     *
     * @return {Object} The modified DOM element.
     */
    function plotStatistics(viz, statistics, padding, isBaseline) {
        var svg = viz.state.n.s,
            scale = viz.scale, yScale = scale.y,
            xRange = scale.x.range(), labelX,
            meanY = yScale(statistics.mean), medianY = yScale(statistics.median),
            offsetMeanY = 0, offsetMedianY = 0;

        /* prevent mean and median labels from overlapping */
        if (meanY > medianY)
            offsetMeanY = 10;
        else
            offsetMedianY = 10;

        /* label displacement from end of line */
        if (padding)
            labelX = xRange[1] + padding;

        if (viz.isActiveCtrl('mean')) {
            if (isBaseline)
                plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                    '', labelX, meanY + offsetMeanY, 'wildtype-mean');
            else
                plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                    'mean', labelX, meanY + offsetMeanY, 'mean');
        }

        if (viz.isActiveCtrl('median')) {
            if (isBaseline)
                plotHorizontalLine(svg, medianY, xRange[0], xRange[1],
                    '', labelX, medianY + offsetMedianY, 'wildtype-median');
            else
                plotHorizontalLine(svg, medianY, xRange[0], xRange[1],
                    'median', labelX, medianY + offsetMedianY, 'median');
        }

        if (viz.isActiveCtrl('quartile')) {
            if (statistics.quartile !== null) {
                /* reusing variable meanY */
                meanY = yScale(statistics.quartile.q1);

                if (isBaseline)
                    plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                        '', labelX, meanY, 'wildtype-q1');
                else
                    plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                        'Q1', labelX, meanY, 'q1');

                /* reusing variable meanY */
                meanY = yScale(statistics.quartile.q3);
                if (isBaseline)
                    plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                        '', labelX, meanY, 'wildtype-q3');
                else
                    plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                        'Q3', labelX, meanY, 'q3');
            }
        }

        if (viz.isActiveCtrl('max')) {
            /* reusing variable meanY */
            meanY = yScale(statistics.max);
            if (isBaseline)
                plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                    '', labelX, meanY + offsetMeanY, 'wildtype-max');
            else
                plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                    'max', labelX, meanY + offsetMeanY, 'max');
        }

        if (viz.isActiveCtrl('min')) {
            /* reusing variable meanY */
            meanY = yScale(statistics.min);
            if (isBaseline)
                plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                    '', labelX, meanY + offsetMeanY, 'wildtype-min');
            else
                plotHorizontalLine(svg, meanY, xRange[0], xRange[1],
                    'min', labelX, meanY + offsetMeanY, 'min');
        }

        return svg;
    }

    /**
     * Displays a crosshair with horizontal and vertical line segments that
     * intersects at the mouse pointer position. The crosshair consists of
     * four parts, so that the intersection points does not coincide with
     * the mouse pointer coordinate. This prevents events from misfiring.
     *
     * @param {Object} viz The visualisation object.
     *
     * @return {Object} The modified DOM element.
     */
    function renderCrosshair(viz) {
        var svg = viz.state.n.v, xhair;

        /* group cross hair components and hide it during creation */
        svg.selectAll('.xhair').remove();
        xhair = svg.append('g').attr('class', 'xhair');

        /* crosshair horizontal line segment */
        xhair.horizontalLeft = line(xhair, 0, 0, 0, 0);
        xhair.horizontalRight = line(xhair, 0, 0, 0, 0);

        /* crosshair vertical line segment */
        xhair.verticalTop = line(xhair, 0, 0, 0, 0);
        xhair.verticalBottom = line(xhair, 0, 0, 0, 0);

        svg.xhair = xhair;
        return svg;
    }

    function getEmbryoStage(key) {
        if (key.indexOf('_EVL_') !== -1)
            return {
                's': 'E9.5',
                'k': 'EVL'
            };
        else if (key.indexOf('_EVM_') !== -1)
            return {
                's': 'E12.5',
                'k': 'EVM'
            };
        else if (key.indexOf('_EVO_') !== -1)
            return {
                's': 'E14.5 - E15.5',
                'k': 'EVO'
            };
        else if (key.indexOf('_EVP_') !== -1)
            return {
                's': 'E18.5',
                'k': 'EVP'
            };
        else
            return null;
    }

    /**
     * Plot tabular data.
     * 
     * @param {String} id Visualisation identifier.
     * @param {Object} parent Container DOM node.
     * @param {Integer} gid Genotype id.
     * @param {Integer} sid Strain id.
     * @param {Integer} cid Centre id.
     * @param {String} qeid Parameter key.
     * @param {String} procedure Procedure to display.
     * @param {Object} embryoStage Embryo stage if data; otherwise, null.
     */
    function plotTabularData(id, parent, gid, sid, cid, qeid,
        procedure, embryoStage) {
        parent.classed('loading', false);
        var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
            key = procedure.toUpperCase(), data, v, d, tr, title, table,
            stage, header, container;

        if (embryoStage)
            key = 'EMBRYO-' + key;

        data = measurementsSet[ZYGOSITY_ALL][geneId][key];
        if (data === null) {
            displayNoDataWarning(parent, qeid);
            return;
        }

        title = addDiv(parent, null, 'tabular-title');
        stage = addDiv(parent, null, 'tabular-stage');
        header = addDiv(parent, null, 'tabular-table-header');
        container = addDiv(parent, null, 'tabular-table-container');

        title.html('<span class="title-gene-symbol">' +
            availableGenesMap[geneId].geneSymbol +
            '</span><span class="title-procedure">' +
            (embryoStage ? 'Embryo ' : 'Adult ') + procedure +
            ' procedure</span>' +
            '<span class="title-parameter">Combines multiple parameters</span>');
        table = header.append('table');
        tr = table.append('thead').append('tr');
        tr.append('th').text("Parameter Key");
        tr.append('th').text("Name");
        tr.append('th').text("Value");

        table = container.append('table');
        table = table.append('tbody');
        for (key in data) {
            d = data[key];
            tr = table.append('tr').classed('odd', key % 2);
            tr.append('td').text(d.key);
            tr.append('td').text(d.name);
            v = parseFloat(d.value);
            if (isNaN(v))
                v = d.value;
            else {
                if (d.value.indexOf('.') !== -1)
                    v = toDisplayPrecision(v);
                else
                    v = d.value;
            }
            tr.append('td').text(v);
        }

        if (embryoStage)
            stage.html('<span>Stage:</span><span>' + embryoStage.s + '</span>');

        parent.refit = function () {
            height(container, height(parent) - height(title) - height(stage) - height(header));
        };
        parent.refit();
    }

    /**
     * Retrieves viability data from the server and displays them in the
     * visualisation cluster. Calculations are cached for future
     * references.
     * 
     * @param {Integr} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Srain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     */
    function retrieveAndVisualiseViabilityData(id, target, gid, sid,
        cid, qeid) {
        d3.json('rest/viability?' +
            'cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid,
            function (data) {
                var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
                if (data && data.success) {
                    /* update QC status */
                    if (!qcstatus[geneId])
                        qcstatus[geneId] = {};
                    qcstatus[geneId]['VIABILITY'] = 0;

                    if (!measurementsSet[ZYGOSITY_ALL][geneId])
                        measurementsSet[ZYGOSITY_ALL][geneId] = {};
                    measurementsSet[ZYGOSITY_ALL][geneId]['VIABILITY'] =
                        data.viability;
                    plotTabularData(id, target, gid, sid, cid, qeid,
                        'viability', null);
                } else
                    displayNoDataWarning(target, 'OVERVIEWS_VIA');
            });
    }

    /**
     * Retrieves embryo viability data from the server and displays them in the
     * visualisation cluster. Calculations are cached for future
     * references.
     * 
     * @param {Integr} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Srain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     * @param {Object} embryoStage Embryo stage object; otherwise, null.
     */
    function retrieveAndVisualiseEmbryoViabilityData(id, target, gid,
        sid, cid, qeid, embryoStage) {
        d3.json('rest/embryo-viability?' +
            'cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid +
            '&stage=' + embryoStage.k,
            function (data) {
                var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
                if (data && data.success) {
                    /* update QC status */
                    if (!qcstatus[geneId])
                        qcstatus[geneId] = {};
                    qcstatus[geneId]['EMBRYO-VIABILITY'] = 0;

                    if (!measurementsSet[ZYGOSITY_ALL][geneId])
                        measurementsSet[ZYGOSITY_ALL][geneId] = {};
                    measurementsSet[ZYGOSITY_ALL][geneId]['EMBRYO-VIABILITY'] =
                        data.viability;
                    plotTabularData(id, target, gid, sid, cid, qeid, 'viability', embryoStage);
                } else
                    displayNoDataWarning(target, qeid);
            });
    }

    /**
     * Retrieves LacZ overview data from the server and displays them in the
     * visualisation cluster. Calculations are cached for future
     * references.
     * 
     * @param {Integr} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Srain identifier.
     * @param {Integer} cid Centre identifier.
     */
    function retrieveAndVisualiseLacZOverviews(id, target, gid, sid, cid) {
        d3.json('rest/lacz?' +
            'cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid,
            function (data) {
                var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
                if (data && data.success) {
                    if (!measurementsSet[ZYGOSITY_ALL][geneId])
                        measurementsSet[ZYGOSITY_ALL][geneId] = {};
                    measurementsSet[ZYGOSITY_ALL][geneId]['OVERVIEWS_ALZ'] =
                        data.overview;
                    displayLacZOverviews(id, target, gid, sid, cid);
                } else
                    displayNoDataWarning(target, 'OVERVIEWS_ALZ');
            });
    }


    /**
     * Retrieves Gross Morphology overview data from the server and
     * displays them in the visualisation cluster. Calculations are cached
     * for future references.
     * 
     * @param {Integr} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Srain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String] morphologyType Embryo or Placenta
     */
    function retrieveAndVisualiseGrossMorphologyOverviews(id, target, gid, sid, cid, morphologyType) {
        var restTarget = 'rest/' +
            (morphologyType === 'OVERVIEWS_GEP' ? 'gep' : 'gpm');
        d3.json(restTarget + '?' +
            'cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid,
            function (data) {
                var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
                if (data && data.success) {
                    if (!measurementsSet[ZYGOSITY_ALL][geneId])
                        measurementsSet[ZYGOSITY_ALL][geneId] = {};
                    measurementsSet[ZYGOSITY_ALL][geneId][morphologyType] =
                        data.overview;
                    displayGrossMorphologyOverviews(id, target, gid, sid, cid, morphologyType);
                } else
                    displayNoDataWarning(target, morphologyType);
            });
    }

    /**
     * Retrieves gross pathology overview data from the server and displays
     * them in the visualisation cluster. Calculations are cached for future
     * references.
     * 
     * @param {Integr} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Srain identifier.
     * @param {Integer} cid Centre identifier.
     */
    function retrieveAndVisualiseGrossPathologyOverviews(id, target, gid, sid, cid) {
        d3.json('rest/grosspathology?' +
            'cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid,
            function (data) {
                var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
                if (data && data.length > 0) {
                    if (!measurementsSet[ZYGOSITY_ALL][geneId])
                        measurementsSet[ZYGOSITY_ALL][geneId] = {};
                    measurementsSet[ZYGOSITY_ALL][geneId]['OVERVIEWS_PAT'] =
                        data;
                    displayGrossPathologyOverviews(target, gid, sid, cid);
                } else
                    displayNoDataWarning(target, 'OVERVIEWS_PAT');
            });
    }

    function getLacZExpressionCallClass(data) {
        var cls, title, decider;
        if (data.e > 0) {
            decider = 'e';
            cls = 'expression';
            title = 'Expression';
        } else if (data.a > 0) {
            decider = 'a';
            cls = 'ambiguous';
            title = 'Ambiguous';
        } else if (data.ne > 0) {
            decider = 'ne';
            cls = 'no-expression';
            title = 'No expression';
        } else if (data.io > 0) {
            decider = 'io';
            cls = 'image-only';
            title = 'Image only';
        } else {
            decider = '';
            cls = 'no-tissue';
            title = 'Tissue not available';
        }
        return {
            'cls': 'alz-' + cls,
            'title': title,
            'decider': decider
        };
    }

    function addAlzOverviewColumn(tr, clsTitle, data, field, isLastColumn) {
        tr.append('td')
            .attr('class', clsTitle.cls)
            .attr('title', clsTitle.title)
            .classed('alz-last-column', isLastColumn)
            .append('div')
            .attr('class', clsTitle.decider === field ? 'alz-decider' : '')
            .text(data[field]);
    }

    function addAlzOverviewLegend(parent, label, cls, title) {
        var t = parent.append('div').attr('class', 'alz-legend');
        t.append('div').attr('class', 'alz-color-box alz-' + cls);
        t.append('div').attr('class', 'alz-label').text(label);
        if (title)
            t.attr('title', title);
    }

    function displayLacZOverviewsColumnHeader(tr, showLastColumnBorder) {
        var td;
        tr.append('td').text('Male').attr('title', 'Male count');
        tr.append('td').text('Female').attr('title', 'Female count');
        tr.append('td').text('E').attr('title', 'Expression');
        tr.append('td').text('NE').attr('title', 'No Expression');
        tr.append('td').text('A').attr('title', 'Ambiguous');
        td = tr.append('td').text('IO').attr('title', 'Image Only');
        if (showLastColumnBorder)
            td.attr('class', 'alz-last-column');
    }

    function displayLacZOverviewsTitleAndLegends(title, table,
        geneSymbol) {
        var tr;
        title.append('span')
            .attr('class', 'title-gene-symbol')
            .text(geneSymbol);
        title.append('span')
            .attr('class', 'title-procedure')
            .text('LacZ Expression Overview');
        tr = table.append('tr').attr('class', 'alz-overview-header-top');
        tr.append('td');
        tr.append('td').attr('colspan', 6).text('wildtype');
        tr.append('td').attr('colspan', 6).text('mutant');
        tr = table.append('tr').attr('class', 'alz-overview-header-bottom');
        tr.append('td').text('Parameter');
        displayLacZOverviewsColumnHeader(tr, true);
        displayLacZOverviewsColumnHeader(tr, false);
    }

    function displayLacZOverviewsLegendDescriptions(legend) {
        addAlzOverviewLegend(legend, 'Expression', 'expression');
        addAlzOverviewLegend(legend, 'No expression', 'no-expression');
        addAlzOverviewLegend(legend, 'Ambiguous', 'ambiguous');
        addAlzOverviewLegend(legend, 'Image only', 'image-only');
        addAlzOverviewLegend(legend, 'No tissue', 'no-tissue');
        addAlzOverviewLegend(legend, 'Why?', 'decider',
            'Why the call was made?');
    }

    function displayLacZOverviewsRow(tr, data, showLastColumnBorder) {
        var clsTitle = getLacZExpressionCallClass(data);
        addAlzOverviewColumn(tr, clsTitle, data, 'mc');
        addAlzOverviewColumn(tr, clsTitle, data, 'fc');
        addAlzOverviewColumn(tr, clsTitle, data, 'e');
        addAlzOverviewColumn(tr, clsTitle, data, 'ne');
        addAlzOverviewColumn(tr, clsTitle, data, 'a');
        addAlzOverviewColumn(tr, clsTitle, data, 'io', showLastColumnBorder);
    }

    function displayLacZOverviews(id, target, gid, sid, cid) {
        target.classed('loading', false);
        var title = target.append('div').attr('class', 'tabular-title'),
            legend = target.append('div').attr('class', 'alz-legends'),
            content = target.append('div').attr('class', 'alz-contents'),
            table = content.append('table').attr('class', 'alz-overview-table'),
            tr, i, c, temp,
            geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
            data = measurementsSet[ZYGOSITY_ALL][geneId]['OVERVIEWS_ALZ'];

        displayLacZOverviewsTitleAndLegends(title, table,
            availableGenesMap[geneId].geneSymbol);
        for (i = 0, c = data.length; i < c; ++i) {
            temp = data[i];
            tr = table.append('tr');
            tr.append('td').text(temp.qn);

            /* wildtype */
            if (temp.w === undefined)
                tr.append('td')
                    .attr('colspan', 6)
                    .attr('class', 'alz-no-data')
                    .text('No wildtype data');
            else
                displayLacZOverviewsRow(tr, temp.w, true);

            /* mutant */
            if (temp.m === undefined)
                tr.append('td')
                    .attr('colspan', 6)
                    .attr('class', 'alz-no-data')
                    .text('No mutant data');
            else
                displayLacZOverviewsRow(tr, temp.m, false);

            /* if there is associated media, make row click show media */
            if (temp.aqeid)
                tr.classed('has-media', true)
                    .on("click", getImageViewerHandler('#content',
                        cid, gid, sid, temp.aqeid,
                        "Associated media for Adult LacZ - " + temp.qn,
                        temp.aqn + ' - ' + temp.aqeid, temp.qeid));
            else {
                tr.selectAll('*').style('cursor', 'default');
            }
        }
        displayLacZOverviewsLegendDescriptions(legend);
        target.title = title;
        target.legend = legend;
        target.content = content;

        target.refit = function () {
            height(content, height(target) - height(title) - height(legend));
        };
        target.refit();
    }

    function getGrossMorphologyCallClass(data) {
        var cls, title, decider;
        /* these are rules from Henrik Westerberg,
         * email dated Wed 27/01/2016 13:19
         */
        if (data.a > 1 || data.y > 1) {
            decider = 'a';
            cls = 'abnormal';
            title = 'Abnormal';
        } else if (data.u === (data.hom + data.het + data.hem)) {
            decider = 'u';
            cls = 'unobservable';
            title = 'Unobservable';
        } else {
            decider = ''; /* we don't want to highlight */
            cls = 'normal';
            title = 'Normal';
        }
        return {
            'cls': 'gep-' + cls,
            'title': title,
            'decider': decider
        };
    }

    function addGrossMorphologyOverviewsColumn(tr, clsTitle, data, field, isFirstColumn) {
        tr.append('td')
            .attr('class', clsTitle.cls)
            .attr('title', clsTitle.title)
            .classed('gep-first-column', isFirstColumn)
            .append('div')
            .attr('class', clsTitle.decider === field ? 'gep-decider' : '')
            .text(data[field]);
    }

    function addGrossMorphologyOverviewsLegend(parent, label, cls, title) {
        var t = parent.append('div').attr('class', 'gep-legend');
        t.append('div').attr('class', 'gep-color-box gep-' + cls);
        t.append('div').attr('class', 'gep-label').text(label);
        if (title)
            t.attr('title', title);
    }

    function displayGrossMorphologyOverviewsColumnHeader(tr) {
        tr.append('td').text('M').attr('title', 'Male count').attr('class', 'gep-first-column');
        tr.append('td').text('F').attr('title', 'Female count');
        tr.append('td').text('S').attr('title', 'Unknown sex count');
        tr.append('td').text('N').attr('title', 'Normal');
        tr.append('td').text('A').attr('title', 'Abnormal');
        tr.append('td').text('U').attr('title', 'Unobservable');
        tr.append('td').text('NA').attr('title', 'Not available');
    }

    function displayGrossMorphologyOverviewsTitleAndLegends(title, table,
        geneSymbol, morphologyType, showZygosity) {
        var tr;
        title.append('span')
            .attr('class', 'title-gene-symbol')
            .text(geneSymbol);
        title.append('span')
            .attr('class', 'title-procedure')
            .text('Gross Morphology ' + morphologyType + ' Overview');
        tr = table.append('tr').attr('class', 'gep-overview-header-top');
        tr.append('td');
        tr.append('td').attr('colspan', 7).text('wildtype');
        if (showZygosity['hom'])
            tr.append('td').attr('colspan', 7).text('homozygotes');
        if (showZygosity['het'])
            tr.append('td').attr('colspan', 7).text('heterozygotes');
        tr = table.append('tr').attr('class', 'gep-overview-header-bottom');
        tr.append('td').text('Parameter');
        displayGrossMorphologyOverviewsColumnHeader(tr);
        if (showZygosity['hom'])
            displayGrossMorphologyOverviewsColumnHeader(tr);
        if (showZygosity['het'])
            displayGrossMorphologyOverviewsColumnHeader(tr);
    }

    function displayGrossMorphologyOverviewsLegendDescriptions(legend) {
        addGrossMorphologyOverviewsLegend(legend, 'Normal', 'normal');
        addGrossMorphologyOverviewsLegend(legend, 'Abnormal', 'abnormal');
        addGrossMorphologyOverviewsLegend(legend, 'Unobservable', 'unobservable');
        addGrossMorphologyOverviewsLegend(legend, 'Not available', 'not-available');
        addGrossMorphologyOverviewsLegend(legend, 'Why?', 'decider',
            'Why the call was made?');
    }

    function displayGrossMorphologyOverviewsRow(tr, data) {
        var clsTitle = getGrossMorphologyCallClass(data);
        addGrossMorphologyOverviewsColumn(tr, clsTitle, data, 'mc', true);
        addGrossMorphologyOverviewsColumn(tr, clsTitle, data, 'fc');
        addGrossMorphologyOverviewsColumn(tr, clsTitle, data, 'uc');
        addGrossMorphologyOverviewsColumn(tr, clsTitle, data, 'n');
        addGrossMorphologyOverviewsColumn(tr, clsTitle, data, 'a');
        addGrossMorphologyOverviewsColumn(tr, clsTitle, data, 'u');
        addGrossMorphologyOverviewsColumn(tr, clsTitle, data, 'v');
    }

    function displayGrossMorphologyOverviews(id, target, gid, sid, cid, morphologyType) {
        target.classed('loading', false);
        var title = target.append('div').attr('class', 'tabular-title'),
            legend = target.append('div').attr('class', 'gep-legends'),
            content = target.append('div').attr('class', 'gep-contents'),
            table = content.append('table').attr('class', 'gep-overview-table'),
            tr, i, c, temp,
            showZygosity = {
                'hom': false,
                'het': false,
                'hem': false
            },
        geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
            data = measurementsSet[ZYGOSITY_ALL][geneId][morphologyType];

        for (i = 0, c = data.length; i < c; ++i) {
            temp = data[i];
            if (temp.hom !== undefined)
                showZygosity['hom'] = true;
            if (temp.het !== undefined)
                showZygosity['het'] = true;
            if (temp.hem !== undefined)
                showZygosity['hem'] = true;
        }

        displayGrossMorphologyOverviewsTitleAndLegends(title, table,
            availableGenesMap[geneId].geneSymbol,
            morphologyType === 'OVERVIEWS_GEP' ? 'Embryo' : 'Placenta',
            showZygosity);

        for (i = 0, c = data.length; i < c; ++i) {
            temp = data[i];
            tr = table.append('tr');
            tr.append('td').text(temp.qn);

            /* wildtype */
            if (temp.w === undefined)
                tr.append('td')
                    .attr('colspan', 7)
                    .attr('class', 'gep-no-data')
                    .text('No wildtype data');
            else
                displayGrossMorphologyOverviewsRow(tr, temp.w);

            /* mutant (hom) */
            if (showZygosity['hom']) {
                if (temp.hom === undefined)
                    tr.append('td')
                        .attr('colspan', 7)
                        .attr('class', 'gep-no-data')
                        .text('No hom data');
                else
                    displayGrossMorphologyOverviewsRow(tr, temp.hom);
            }

            /* mutant (het) */
            if (showZygosity['het']) {
                if (temp.het === undefined)
                    tr.append('td')
                        .attr('colspan', 7)
                        .attr('class', 'gep-no-data')
                        .text('No het data');
                else
                    displayGrossMorphologyOverviewsRow(tr, temp.het);
            }

            /* if there is associated media, make row click show media */
            if (temp.aqeid)
                tr.classed('has-media', true)
                    .on("click", getImageViewerHandler('#content',
                        cid, gid, sid, temp.aqeid,
                        "Associated media for Gross Morphology - " + temp.qn,
                        temp.aqn + ' - ' + temp.aqeid, temp.qeid));
            else {
                tr.selectAll('*').style('cursor', 'default');
            }
        }
        displayGrossMorphologyOverviewsLegendDescriptions(legend);
        target.title = title;
        target.legend = legend;
        target.content = content;

        target.refit = function () {
            height(content, height(target) - height(title) - height(legend));
        };
        target.refit();
    }

    function getGrossPathologyBackHandler(target, gid, sid, cid) {
        return function () {
            displayGrossPathologyOverviews(target, gid, sid, cid);
        };
    }

    function displayGrossPathologyRowDetails(target, gid, sid, cid, data) {
        target.classed('loading', false);
        var back = target.select('.tabular-back-button'),
            content = target.select('.tabular-table-container'),
            table, tr, i, datum, terms, t, td;
        table = content.append('table').attr('class', 'gross-pathology-details-table');
        tr = table.append('thead').append('tr');
        tr.append('th').text('Animal name');
        tr.append('th').text('Zygosity');
        tr.append('th').text('Gender');
        tr.append('th').text('Terms');
        for (i in data) {
            datum = data[i];
            tr = table.append('tbody').append('tr').classed('odd', i % 2);
            tr.append('td').text(datum.n);
            tr.append('td').text(prepareZygosity(datum.z));
            tr.append('td')
                .text((datum.s === 1 ? 'Male' : 'Female'))
                .attr('class', (datum.s === 1 ? 'male' : 'female') + '-specimen');
            td = tr.append('td').attr('class', 'gross-pathology-terms');

            terms = datum.v;
            if (terms) {
                terms = terms.split(',');
                for (t in terms)
                    td.append('div').text(terms[t])
                        .classed('normal-term', terms[t] === 'normal');
            }
        }
        back.style('display', 'inline-block')
            .on('click', getGrossPathologyBackHandler(target, gid, sid, cid));
    }

    function getGrossPathologyRowClickHandler(target, gid, sid, cid, qeid, name) {
        return function () {
            target.select('.tabular-title').append('span').text(name);
            target.select('.tabular-table-container')
                .selectAll('*').remove();

            var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
                lookupKey = qeid + '_SIMPLE', data;

            if (!measurementsSet[ZYGOSITY_ALL][geneId])
                measurementsSet[ZYGOSITY_ALL][geneId] = {};
            data = measurementsSet[ZYGOSITY_ALL][geneId][lookupKey];

            if (data === undefined) {
                target.classed('loading', true);
                d3.json('rest/measurements?' +
                    '&cid=' + cid +
                    '&gid=' + gid +
                    '&sid=' + sid +
                    '&qeid=' + qeid,
                    function (data) {
                        if (data && data.success) {
                            measurementsSet[ZYGOSITY_ALL][geneId][lookupKey] =
                                data.measurements;

                            displayGrossPathologyRowDetails(target, gid, sid,
                                cid, data.measurements);
                        } else
                            displayNoDataWarning(target, qeid);
                    });
            } else {
                displayGrossPathologyRowDetails(target, gid, sid, cid, data);
            }
        };
    }

    function displayGrossPathologyOverviews(target, gid, sid, cid) {
        target.classed('loading', false);
        target.selectAll('*').remove();
        var title = target.append('div').attr('class', 'tabular-title'),
            back = target.append('div').attr('class', 'tabular-back-button')
            .text('Back').style('display', 'none'),
            content = target.append('div').attr('class', 'tabular-table-container'),
            table = content.append('table').attr('class', 'gross-pathology-table'),
            h, tr, i, c, temp, count,
            geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
            data = measurementsSet[ZYGOSITY_ALL][geneId]['OVERVIEWS_PAT'];

        title.append('span')
            .attr('class', 'title-gene-symbol')
            .text(availableGenesMap[geneId].geneSymbol);
        title.append('span')
            .attr('class', 'title-procedure')
            .text('Gross Pathology Overview');

        h = table.append('thead');
        tr = h.append('tr');
        tr.append('th').attr('rowspan', 2).text('Anatomy');
        tr.append('th').attr('colspan', 2).text('Male');
        tr.append('th').attr('colspan', 2).text('Female');

        tr = h.append('tr');
        tr.append('th').text('Normal');
        tr.append('th').text('Abnormal');
        tr.append('th').text('Normal');
        tr.append('th').text('Abnormal');
        for (i = 0, c = data.length; i < c; ++i) {
            temp = data[i];
            tr = table.append('tr').classed('odd', i % 2);
            tr.append('td').text(temp.qn);
            if (temp.mt === undefined) {
                tr.append('td').text('-');
                tr.append('td').text('-');
            } else {
                tr.append('td').text(temp.mn)
                    .attr('class', temp.mn === 0 ? 'zero-count' : '');
                count = temp.mt - temp.mn;
                tr.append('td').text(count)
                    .attr('class', count === 0 ? 'zero-count' : '');
            }
            if (temp.ft === undefined) {
                tr.append('td').text('-');
                tr.append('td').text('-');
            } else {
                tr.append('td').text(temp.fn)
                    .attr('class', temp.fn === 0 ? 'zero-count' : '');
                count = temp.ft - temp.fn;
                tr.append('td').text(count)
                    .attr('class', count === 0 ? 'zero-count' : '');
            }
            tr.on('click', getGrossPathologyRowClickHandler(target, gid,
                sid, cid, temp.qeid, temp.qn));
        }
        target.refit = function () {
            height(content, height(target) - height(title) - height(back));
        };
        target.refit();
    }

    /**
     * Retrieves fertility data from the server and displays them in the
     * visualisation cluster. Calculations are cached for future
     * references.
     * 
     * @param {Integr} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Srain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     */
    function retrieveAndVisualiseFertilityData(id, target, gid, sid,
        cid, qeid) {
        d3.json('rest/fertility?' +
            '&cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid,
            function (data) {
                var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
                if (data && data.success) {
                    /* update QC status */
                    if (!qcstatus[geneId])
                        qcstatus[geneId] = {};
                    qcstatus[geneId]['FERTILITY'] = 0;

                    if (!measurementsSet[ZYGOSITY_ALL][geneId])
                        measurementsSet[ZYGOSITY_ALL][geneId] = {};
                    measurementsSet[ZYGOSITY_ALL][geneId]['FERTILITY'] =
                        data.fertility;
                    plotTabularData(id, target, gid, sid, cid, qeid,
                        'fertility', null);
                } else
                    displayNoDataWarning(target, 'OVERVIEWS_FER');
            });
    }

    /**
     * Process the centres data returned by the server.
     * 
     * @param {Object} data Array of centre data.
     */
    function processCentres(data) {
        var i, c;
        centres = data.centres;
        centresMap = {};
        for (i = 0, c = centres.length; i < c; ++i)
            centresMap[centres[i].i] = centres[i];
    }

    /**
     * Process the centres activity data returned by the server.
     * 
     * @param {Object} data Array of centre activity data.
     */
    function processCentreActivity(data) {
        var i, c, record, cid;
        centreActivity = {};
        if (data && data.success) {
            data = data.activity;
            for (i = 0, c = data.length; i < c; ++i) {
                record = data[i];
                cid = record.c;
                if (centreActivity[cid] === undefined)
                    centreActivity[cid] = [];
                centreActivity[cid].push(record);
            }
        }
    }

    /**
     * To facilitate interactive gene/strain search, we create a single search
     * string which contains all of the gene/strain fields that are searchable.
     * This reduces the number of searches.
     * 
     * @param {Object} datum Contains gene/strain property fields.
     * @returns {String} A search string with all of the searchable fields.
     */
    function prepareGeneSearchString(datum) {
        var filterString = '', allele;
        if (datum.geneSymbol)
            filterString += datum.geneSymbol;
        if (datum.alleleName) {
            allele = datum.alleleName.match(REGEX_ALLELE);
            if (allele)
                filterString += ' ' + allele[1];
        }
        if (datum.strain)
            filterString += ' ' + datum.strain;
        if (datum.genotype)
            filterString += ' ' + datum.genotype;
        return filterString.toLowerCase();
    }

    /**
     * Returns a function that sorts the gene/strain list.
     * 
     * @param {String} field Which field to use for sorting.
     * @returns {Function} Gene sorting function.
     */
    function getGeneSorter(field) {
        var fn;
        if (field === SORT_BY_GENE_CENTRE)
            fn = function (a, b) {
                if (a && b) {
                    a = a[field];
                    b = b[field];
                    if (a && b)
                        return centresMap[a].f.localeCompare(centresMap[b].f);
                    else
                        return 0;
                } else {
                    return 0;
                }
            };
        else
            fn = function (a, b) {
                if (a && b) {
                    a = a[field];
                    b = b[field];
                    if (a && b)
                        return a.localeCompare(b);
                    else
                        return 0;
                } else {
                    return 0;
                }
            };
        return fn;
    }

    /**
     * Sorts the list of genes using the current gene sorting field.
     */
    function sortGenes() {
        if (sortedBy.genes !== undefined) {
            genes.sort(getGeneSorter(sortedBy.genes));
        }
    }

    /**
     * Prpare a unique identifier for gene/strain and centre.
     * 
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     * @returns {String} Unique identifier for the gene/strain.
     */
    dcc.prepareGeneStrainCentreId = function (gid, sid, cid) {
        return gid + '-' + sid + '-' + cid;
    };

    /**
     * Returns a unique identifier for gene/strain.
     * 
     * @param {Object} data Contains gene/strain data.
     * @returns {String} Unique identifier for the gene/strain.
     */
    dcc.getGeneStrainCentreId = function (data) {
        return dcc.prepareGeneStrainCentreId(data.gid, data.sid, data.cid);
    };


    /**
     * Process the genes data returned by the server.
     * 
     * @param {Object} data Array of genes data.
     */
    function processGenes(data) {
        var datum, i, c, id;
        genes = data.genestrains;
        for (i = 0, c = genes.length; i < c; ++i) {
            datum = genes[i];

            /* when a gene is search using genotype, allele, strain etc., we
             * only need to check against this single search string */
            datum.filter = prepareGeneSearchString(datum);

            /* maps genotype id to gene/strain object */
            datum.gsc = dcc.getGeneStrainCentreId(datum);
            availableGenesMap[datum.gsc] = datum;
        }
        sortGenes();
    }

    /**
     * To facilitate interactive parameter search, we create a single search
     * string which contains all of the parameter fields that are searchable.
     * This reduces the number of searches.
     * 
     * @param {Object} datum Contains parameter property fields.
     * @returns {String} A search string with all of the searchable fields.
     */
    function prepareParameterSearchString(datum) {
        var filterString = '';
        if (datum.e)
            filterString += datum.e;
        if (datum.n)
            filterString += ' ' + datum.n;
        return filterString.toLowerCase();
    }

    /**
     * Returns a function that compares items by supplied field.
     * 
     * @param {String} field Which field to use for comparison.
     * @returns {Function} Comparison function.
     */
    function getFieldComparator(field) {
        return function (a, b) {
            return a[field].localeCompare(b[field]);
        };
    }

    /**
     * Sorts the list of parameters using the current parameter sorting field.
     */
    function sortParameters() {
        if (sortedBy.parameters !== undefined) {
            parameters.sort(getFieldComparator(sortedBy.parameters));
        }
    }

    /**
     * Sorts the list of procedure using the three letter procedure id field.
     */
    function sortProcedures() {
        procedures.sort(getFieldComparator('c'));
    }

    /**
     * Process the parameter data returned by the server.
     * 
     * @param {Object} data Array of parameters data.
     */
    function processParameters(data) {
        var datum, i, c;
        parameters = data.parameters;
        for (i = 0, c = parameters.length; i < c; ++i) {
            datum = parameters[i];

            if (procedureKeyToProcedureDetailsMap[datum.p[0]] === undefined)
                continue;

            /* when a parameter is search using parameter key, parameter name,
             * etc., we only need to check against this single search string */
            datum.filter = prepareParameterSearchString(datum);

            /* maps parameter key to parameter object */
            availableParametersMap[datum.e] = datum;

            /* maps parameter id to parameter key */
            parameterIdToKeyMap[datum.id] = datum.e;

            /* used during sorting */
            datum.pn = procedureKeyToProcedureDetailsMap[datum.p[0]].n;
        }
        sortParameters();
    }

    /**
     * Process all of the procedures.
     * @param {Object} data Array of procedures data.
     */
    function processProcedures(data) {
        var i, c, t;
        procedures = data.procedures;
        /* maps procedure key to procedure object */
        procedureKeyToProcedureDetailsMap = {};
        procedureColour = {};
        for (i = 0, c = procedures.length; i < c; ++i) {
            t = procedures[i];
            procedureKeyToProcedureDetailsMap[t.i] = t;
            procedureColour[t.c] = c < iWantHue.length ? iWantHue[i] :
                '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
        }
    }

    /**
     * Retrieves the list of genotype identifiers currently selected. The list
     * preserves the ordering of the genes in the selection.
     * 
     * @returns {String} Comma separated string of genotype ids.
     */
    function getGeneList() {
        if (geneList === undefined)
            return null;

        var temp = '';
        geneList.traverse(function (gene) {
            temp += dcc.getGeneStrainCentreId(gene) + ',';
        });
        return temp.substring(0, temp.length - 1);
    }

    /**
     * Retrieves the list of parameter keys currently selected. The list
     * preserves the ordering of the parameters in the selection.
     * 
     * @returns {Array} Comma separate string of parameter keys.
     */
    function getParameterList() {
        if (parameterList === undefined)
            return null;

        var temp = '';
        parameterList.traverse(function (parameter) {
            temp += parameter[PARAMETER_KEY_FIELD] + ',';
        });
        return temp.substring(0, temp.length - 1);
    }

    /**
     * Prepares the bookmark link using the supplied gene and parameter
     * selection. This bookmark also contains all of the visualisation
     * settings that will allow a user to load the web app in the exact same
     * state elsewhere.
     * 
     * NOTE: If either the genotype id or parameter key is undefined, the
     * bookmark is created by retrieving the current gene and parameter
     * selection respectively.
     * 
     * @param {String} geneId The genotype identifier.
     * @param {String} parameter The parameter key.
     * @returns {String} The bookmark URL.
     */
    function prepareBookmark(geneId, parameter) {
        return location.protocol + '//' + location.host +
            location.pathname + '?gid=' + (geneId ? geneId : getGeneList()) +
            '&qeid=' + (parameter ? parameter : getParameterList()) +
            '&ctrl=' + dcc.visualisationControl;
    }

    /**
     * Displays the current bookmark in a browser window so that users
     * can copy the bookmark link.
     * 
     * @param {String} geneId The genotype identifier.
     * @param {String} parameter The parameter key.
     */
    function showBookmark(geneId, parameter) {
        var win = window.open("", "Bookmark for current visualisation",
            "width=700,height=100"),
            bookmark = prepareBookmark(geneId, parameter);
        win.document.body.innerHTML =
            '<div style="font-family:Arial;font-size:14px;">'
            + '<p>Please use the following link to cite this visualisation:</p>'
            + '<a href="' + bookmark + '">' + bookmark + '</a></div>';
        win.focus();
    }

    /**
     * Retrieves measurements data as comma separated string.
     * 
     * @param {String} geneId Gene identifier.
     * @param {Object} data Array of measurments.
     * @param {Boolean} includeXAxis Should we include x-axis column.
     * @returns {String} Comma separated measurement values.
     */
    function getCsvRawData(geneId, data, includeXAxis) {
        var csv = "", datum, i, c, gene = availableGenesMap[geneId], date;
        for (i = 0, c = data.length; i < c; ++i) {
            datum = data[i];
            csv += '"' + datum.n + '","'; /* animal name */
            csv += (datum.g === 0 ? 'Baseline' : gene.genotype) + '","';
            csv += gene.mgiStrainId + '","';
            csv += prepareSex(datum.s + '') + '","';
            csv += prepareZygosity(datum.z) + '","';
            date = new Date(datum.d);
            csv += date.toISOString() + '",';

            if (includeXAxis)
                csv += JSON.stringify(datum.x) + ',';
            csv += JSON.stringify(datum.y ? datum.y : datum.v) + '\n';
        }
        return csv;
    }

    /**
     * Prepare viability data for download.
     * 
     * @param {Object} data Viability data.
     * @returns {String}
     */
    function prepareViabilityData(data) {
        var m = 'Viability data', temp;
        m += '\noutcome: ' + data.outcome;
        m += '\np-value for outcome call: ' + data.pValue;
        m += '\npercentage homozygous: ' + data.percentageHomozygous;

        temp = data.groups['Male and female'];
        m += '\nTotal pups WT: ' + temp[0].v;
        m += '\nTotal pups heterozygous: ' + temp[1].v;
        m += '\nTotal pups homozygous: ' + temp[2].v;

        temp = data.groups['Male'];
        m += '\nTotal male WT: ' + temp[0].v;
        m += '\nTotal male heterozygous: ' + temp[1].v;
        m += '\nTotal male homozygous: ' + temp[2].v;

        temp = data.groups['Female'];
        m += '\nTotal female WT: ' + temp[0].v;
        m += '\nTotal female heterozygous: ' + temp[1].v;
        m += '\nTotal female homozygous: ' + temp[2].v;

        return m;
    }

    /**
     * Prepare fertility data for download.
     * 
     * @param {Object} data Fertility data.
     * @returns {String}
     */
    function prepareFertilityData(data) {
        var m = 'Fertility data', temp;
        m += '\nGross findings male: ' + data.grossFindingsMale;
        m += '\nGross findings female: ' + data.grossFindingsFemale;

        temp = data['primary'];
        m += '\nTotal matings (primary): ' + temp.matings;
        m += '\nTotal pups born (primary): ' + temp.born;
        m += '\nTotal litters (primary): ' + temp.litters;
        m += '\nTotal pups with dissection (primary): ' +
            temp.dissectionEmbryos;

        temp = data['male'];
        m += '\nTotal matings (male screen): ' + temp.matings;
        m += '\nTotal pups born (male screen): ' + temp.born;
        m += '\nTotal litters (male screen): ' + temp.litters;
        m += '\nTotal pups/embryos (male screen): ' + temp.dissectionEmbryos;

        temp = data['female'];
        m += '\nTotal matings (female screen): ' + temp.matings;
        m += '\nTotal pups born (female screen): ' + temp.born;
        m += '\nTotal litters (female screen): ' + temp.litters;
        m += '\nTotal pups/embryos (female screen): ' + temp.dissectionEmbryos;

        return m;
    }

    /**
     * Prepares the raw measurements for download. Note that we use the
     * measurements that are cached in the processed data, and do not retrieve
     * data from the server. This ensures that the data which the user is
     * downloading is the same data that the visualisation is currently
     * displaying. Furthermore, this reduces data transfer bandwidth.
     * 
     * @param {String} geneId Gene identifier.
     * @param {String} parameter Parameter key.
     * @returns {String} A comma separated value content with proper headers.
     */
    function prepareRawDataForDownload(geneId, parameter) {
        var measurements, data, csv, dataset, includeXAxis;
        measurements = measurementsSet[zygosity];
        data = measurements[geneId][parameter];
        if (data) {
            includeXAxis = data.plottype.xl !== undefined;

            /* add CSV header */
            csv =
                'Animal name, Genotype, MGI Strain Id, Gender, Zygosity, '
                + 'Start date, ' +
                (includeXAxis ? data.plottype.xl + ', ' : '') +
                data.plottype.yl + '\n';

            dataset = data.wildtype.dataset;
            if (dataset)
                csv += getCsvRawData(geneId, dataset, includeXAxis);
            dataset = data.mutant.dataset;
            if (dataset)
                csv += getCsvRawData(geneId, dataset, includeXAxis);
        }
        return csv;
    }

    /**
     * Displays the comma separated values using a separate browser window.
     * 
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     * @param {String} bookmark The bookmark URL to the visualisation.
     */
    function getRawDataDownloader(gid, sid, cid, qeid, bookmark) {
        return function () {
            preventEventBubbling();
            var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
                data = prepareRawDataForDownload(geneId, qeid);
            if (data) {
                var win = window.open('', '_blank');
                win.document.body.innerHTML =
                    'Raw measurements for <a target="_blank" href="' + bookmark
                    + '">' + bookmark + '</a></br></br>'
                    + '<textarea style="width:100%;height:90%">'
                    + data + '</textarea>';
                win.focus();
            } else {
                var win = window.open('',
                    'Raw data for centre id ' + cid +
                    ', genotype id ' + gid +
                    ', strain id ' + sid +
                    ' and parameter key ' + qeid,
                    'width=700,height=100');
                win.document.body.innerHTML =
                    '<div style="font-family:Arial;font-size:14px;">' +
                    '<p>No measurements for centre id ' + cid +
                    ', genotype id ' + gid +
                    ', strain id ' + sid +
                    ' and parameter key "' + qeid + '".</p></div>';
                win.focus();
            }
        };
    }

    /**
     * Appends column header for zygosity.
     * 
     * @param {Object} parent DOM node that represents annotation object.
     * @param {String} suffix Class suffix for zygosity (het, hom, hem, all). 
     * @param {String} label Header text to display.
     */
    function addZygosityHeader(parent, suffix, label) {
        addDiv(addColumn(parent), null, 'annotation-' + suffix).text(label);
    }

    /**
     * Updates zygosity column header. This is to highlight selected zygosity
     * in the visualisation to match the column in the annotation panel.
     */
    function updateZygosityHeader() {
        d3.selectAll('.annotation-het')
            .classed('on', dcc.visualisationControl & controlOptions.het);

        d3.selectAll('.annotation-hom')
            .classed('on', dcc.visualisationControl & controlOptions.hom);

        d3.selectAll('.annotation-hem')
            .classed('on', dcc.visualisationControl & controlOptions.hem);
    }

    function displayAnnotation(data, node, gid, sid, cid, qeid) {
        if (data.length < 1) {
            node.text('Server returned empty annotation data')
                .classed('annotation-warning', true);
            return;
        } else
            node.classed('annotation-warning', false);

        var i = 0, annotations = data.annotations,
            c = annotations.length, datum, table, id, title,
            header, mpterm, pvalue, effectsize, stdError,
            numMaleMutant, numFemaleMutant,
            numMaleWildtype, numFemaleWildtype,
            geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
            graphType = measurementsSet[ZYGOSITY_ALL][geneId][qeid].plottype.t,
            notCategorical = !(graphType === 'nominal'),
            mpTermBaseURL = '../data/phenotypes/';

        /* prepare column/row descriptions */
        table = node.append('div')
            .attr('class', 'annotation-metadata')
            .classed('outdated-annotations',
                lastUpdate[geneId][qeid] > data.lastUpdate);
        table.append('div').attr('class', 'measurements-date')
            .text(dcc.dateFormat(new Date(lastUpdate[geneId][qeid])));
        table.append('div').attr('class', 'annotations-date')
            .text(dcc.dateFormat(new Date(data.lastUpdate)));

        table = node.append('table');
        header = table.append('thead').append('tr');
        mpterm = addRow(table, 'even');
        pvalue = addRow(table, 'odd');
        if (notCategorical) {
            effectsize = addRow(table, 'even');
            stdError = addRow(table, 'odd');
        }
        numFemaleMutant = addRow(table, 'even');
        numMaleMutant = addRow(table, 'odd');
        numFemaleWildtype = addRow(table, 'even');
        numMaleWildtype = addRow(table, 'odd');

        addColumn(header);
        addColumn(mpterm, 'MP term')
            .attr('title', "Mouse phenotype ontology term");
        addColumn(pvalue, 'p-value')
            .attr('title', 'p-value for test of null hypothesis of zero genotypic effect against two-tailed alternative');
        if (notCategorical) {
            addColumn(effectsize, 'Effect size')
                .attr('title', 'Genotypic effect estimate (HOM mean minus wild type mean)');
            addColumn(stdError, 'Standard error')
                .attr('title', 'Standard error of genotypic effect estimate');
        }
        addColumn(numFemaleMutant, '# Mutant female');
        addColumn(numMaleMutant, '# Mutant male');
        addColumn(numFemaleWildtype, '# Wildtype female');
        addColumn(numMaleWildtype, '# Wildtype male');

        var mgs = metadataGroups[geneId][qeid], addMetadataGroup = false,
            groupToIndex = {};
        if (mgs && mgs.groups && mgs.groups.length > 1) {
            addMetadataGroup = true;
            for (var mi = 0, mc = mgs.groups.length; mi < mc; ++mi)
                groupToIndex[mgs.groups[mi].g] = mi + 1;
            annotations.sort(function (a, b) {
                return groupToIndex[a.mg] > groupToIndex[b.mg];
            });
        }
        while (i < c) {
            datum = annotations[i++];
            if (!datum)
                continue;
            switch (datum.z) {
                case 0:
                    id = "het";
                    title = "Heterozygous";
                    break;
                case 1:
                    id = "hom";
                    title = "Homozygous";
                    break;
                case 2:
                    id = "hem";
                    title = "Hemizygous";
                    break;
            }
            if (addMetadataGroup && groupToIndex[datum.mg] !== undefined) {
                title += ' (group ' + groupToIndex[datum.mg] + ')';
            }

            addZygosityHeader(header, id, title);
            if (datum.p < dcc.pvalueThreshold && datum.mp1) {
                addColumn(mpterm, datum.mp1.description,
                    mpTermBaseURL + datum.mp1.mpTerm)
                    .attr('class', 'outcome-' + datum.mp1.outcome);
            } else {
                addColumn(mpterm, 'N/A');
            }
            addColumn(pvalue, toDisplayPrecision(datum.p));
            if (notCategorical) {
                addColumn(effectsize, toDisplayPrecision(datum.e));
                addColumn(stdError, toDisplayPrecision(datum.se));
            }
            addColumn(numFemaleMutant, datum.fm);
            addColumn(numMaleMutant, datum.mm);
            addColumn(numFemaleWildtype, datum.fw);
            addColumn(numMaleWildtype, datum.mw);
        }

        updateZygosityHeader();
    }


    function getMetadataValuesRow(row, key, value, groupIdx) {
        return '<tr class="' + (row % 2 ? 'odd' : 'even')
            + (groupIdx === undefined ? '"><td>' :
                '"><td class="metadata-group-idx">'
                + (groupIdx + 1) + '</td><td>')
            + key + '</td><td>'
            + (value === undefined ? 'missing - not supplied' : value)
            + '</td></tr>';
    }

    function getMetadataValuesHeader(title, showGroup) {
        return '<div class="metadata-details-title">' + title + '</div>'
            + '<table><thead><thead>'
            + (showGroup ? '<td class="metadata-group-idx">Group</td>' : '')
            + '<td>Parameter</td><td>Value</td></thead><tbody>';
    }

    function getMetadataDetails(geneId, qeid) {
        var mg = metadataGroups[geneId][qeid], common = {},
            groupCount = 0, diffRowCount = 0, commonRowCount = 0,
            commonValues = '',
            diffValues = getMetadataValuesHeader('Differing values', true);

        if (mg.groups.length === 0)
            return '<div class="metadata-details-warning">'
                + 'Metadata required for analysis are unavailable</div>';

        /* set the common values */
        for (var grp in mg.groups) {
            var keyValues = mg.groups[grp].v;
            for (var key in keyValues) {
                if (!mg.diffSet[key])
                    commonValues += getMetadataValuesRow(commonRowCount++,
                        key, keyValues[key]);
            }
        }
        commonValues += '</tbody></table>';

        /* set differing values */
        for (var key in mg.diffSet) {
            for (var grp in mg.groups) {
                var keyValues = mg.groups[grp].v;
                diffValues += getMetadataValuesRow(diffRowCount++,
                    key, keyValues[key], groupCount);
                groupCount++;
            }
        }
        diffValues += '</tbody></table>';

        if (diffRowCount > 0)
            diffValues += getMetadataValuesHeader('Common values');
        else
            diffValues = getMetadataValuesHeader('No metadata split');
        return diffValues + commonValues;
    }

    function createTabbedPanels(target, panels) {
        var selector = target.append('div').attr('class', 'details-tab'),
            content = target.append('div').attr('class', 'details-panel');

        selector.selectAll('div').data(panels).enter().append('div')
            .classed('active-panel', function (d) {
                return panels[0] === d; /* auto select first */
            })
            .text(function (d) {
                return d;
            })
            .on('click', function (d) {
                var selected = d3.select(this), datum = selected.datum(),
                    tabs = selector.selectAll('div'),
                    contents = content.selectAll('[class*="panel-content-"]');
                tabs.classed('active-panel', function (d) {
                    return datum === d;
                });

                contents.classed('hidden', true);
                contents.filter(function (d) {
                    return datum === d;
                }).classed('hidden', false);
            });

        content.selectAll('div').data(panels).enter().append('div')
            .attr('class', function (d) {
                return 'panel-content-' + d;
            })
            .classed('hidden', function (d) {
                return panels[0] !== d; /* hide content except for the first */
            });
    }

    function createFurtherDetailsPanel(target) {
        var node = target.append('div').attr('class', 'further-details');
        node.append('div').attr('class', 'parameter-details');
        createTabbedPanels(node, ['Annotation', 'Metadata']);
        refitFurtherDetailsPanel(target);
        return node;
    }

    function refitFurtherDetailsPanel(target) {
        height(target.select('.details-panel'),
            height(target.select('.further-details'))
            - height(target.select('.details-tab')));
    }

    function displayMetadata(target, geneId, qeid) {
        target.select('.panel-content-Metadata')
            .html(getMetadataDetails(geneId, qeid));
    }

    /**
     * Retrieves annotation results from the server and displayed them in the
     * annotations panel below the visualisation.
     * 
     * @param {Object} target Visualisation container.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     */
    function retrieveAndShowAnnotation(target, gid, sid, cid, qeid) {
        d3.json('rest/annotations?' +
            'cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid +
            '&qeid=' + qeid,
            function (data) {
                var node = target.select('.further-details'),
                    geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
                    annotationDetails = node
                    .select('.panel-content-Annotation');
                node.classed('loading', false);
                if (data && data.success) {
                    if (!annotations[geneId])
                        annotations[geneId] = {};
                    annotations[geneId][qeid] = data;
                    displayAnnotation(data, annotationDetails,
                        gid, sid, cid, qeid);
                } else
                    annotationDetails.text('Annotation data unavailable')
                        .classed('annotation-warning', true);
            });
    }

    /**
     * Display statistical annotation below the visualsiation.
     * 
     * @param {Object} target Visualisation container.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     */
    function displayStatisticsInformation(target, gid, sid, cid, qeid) {
        var annotation, node = target.select('.panel-content-Annotation'),
            geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);

        d3.select(node.node().parentNode.parentNode)
            .select('.parameter-details')
            .text('Parameter key: ' + qeid);

        /* do we have annotation for this genotype? */
        if (annotations[geneId]) {
            /* do we have annotation for this parameter */
            annotation = annotations[geneId][qeid];
            if (annotation)
                displayAnnotation(annotation, node, gid, sid, cid, qeid);
            else
                retrieveAndShowAnnotation(target, gid, sid, cid, qeid);
        } else
            retrieveAndShowAnnotation(target, gid, sid, cid, qeid);
    }

    /**
     * Displays a warning message to notify missing measurements.
     * 
     * @param {Object} target Visualisation container.
     * @param {String} parameterKey Parameter key.
     * @param {String} what What is missing.
     */
    function displayNoDataWarning(target, parameterKey, what) {
        target.classed('loading', false);

        var param = availableParametersMap[parameterKey],
            node = addDiv(target, null, 'warning');
        addDiv(node, null, 'warn-message',
            'No ' + (what ? what : 'measurements') +
            ' for the following context');
        if (param === undefined) {
            switch (parameterKey) {
                case 'OVERVIEWS_ALZ':
                    param = {
                        'pn': 'Adult LacZ',
                        'n': 'Expression Overview'
                    };
                    break;
                case 'OVERVIEWS_PAT':
                    param = {
                        'pn': 'Gross Pathology',
                        'n': 'Normality Overview'
                    };
                    break;
                case 'OVERVIEWS_FER':
                    param = {
                        'pn': 'Adult Fertility',
                        'n': 'Fertility Overview'
                    };
                    break;
                case 'OVERVIEWS_PAT':
                    param = {
                        'pn': 'Adult Viability',
                        'n': 'Viability Overview'
                    };
                    break;
                case 'OVERVIEWS_GEP':
                    param = {
                        'pn': 'Gross Morphology Embryo',
                        'n': 'Expression Overview'
                    };
                    break;
                case 'OVERVIEWS_GPM':
                    param = {
                        'pn': 'Gross Morphology Placenta',
                        'n': 'Expression Overview'
                    };
                    break;
            }
            param.e = 'N/A (procedure-level data)';
        }
        addDiv(node, null, 'warn-procedure', param.pn);
        addDiv(node, null, 'warn-parameter', param.n);
        addDiv(node, null, 'warn-parameter-key', param.e);
    }

    /**
     * Process measurements returned by the server.
     * 
     * @param {Object} data Measurements returned by the server,
     * @param {Integer} gid Genotype identifier.
     * @param {String} qeid Parameter key of the measurements.
     */
    function processMeasurements(data, gid, qeid) {
        var datum, i = 0, c = data.length, isWildtype = gid === 0,
            plotType = determinePlotType(availableParametersMap[qeid]),
            mutantDataset = [], wildtypeDataset = [],
            mutantStatistics, wildtypeStatistics, temp = null;
        while (i < c) {
            datum = data[i++];
            if (datum.g === 0)
                wildtypeDataset.push(datum);
            else
                mutantDataset.push(datum);
        }

        /**
         * To simplify visualisation code, assume that wildtype data is mutant
         * data if we are only visualising wildtype. */
        if (isWildtype)
            mutantDataset = wildtypeDataset;

        if (plotType.t !== 'nominal') {
            mutantDataset = processData(mutantDataset, plotType);
            if (!isWildtype)
                wildtypeDataset = processData(wildtypeDataset, plotType);
        }

        switch (plotType.t) {
            case 'series':
                mutantStatistics =
                    calculateStatistics(mutantDataset, 'a', 'x', 'y',
                        'e', 'a', 'm');
                if (!isWildtype)
                    wildtypeStatistics =
                        calculateStatistics(wildtypeDataset, 'a', 'x', 'y',
                            'e', 'a', 'm');
                break;

            case 'point':
                mutantStatistics =
                    calculateStatistics(mutantDataset, 'a', 'd', 'y',
                        'e', 'a', 'm');
                if (!isWildtype)
                    wildtypeStatistics =
                        calculateStatistics(wildtypeDataset, 'a', 'd', 'y',
                            'e', 'a', 'm');
                break;

            case 'nominal':
                mutantStatistics = processCategorical(data);
                wildtypeStatistics = undefined;
                break;
        }

        temp = {
            'plottype': plotType,
            'mutant': {
                'dataset': mutantDataset,
                'statistics': mutantStatistics
            },
            'wildtype': {
                'dataset': wildtypeDataset,
                'statistics': wildtypeStatistics
            }
        };
        return temp;
    }

    /**
     * Update the QC status of the visualisation. This is display in the
     * top-left corner of the visualisation.
     * 
     * @param {String} geneId Genotype identifier.
     * @param {String} parameter Parameter key.
     */
    function updateQcStatus(geneId, parameter) {
        var status, msg,
            node = d3.select('#qcstatus-' + geneId + '-' + parameter);
        node.attr('title', '').attr('class', 'qc-unknown');
        if (qcstatus[geneId] !== undefined &&
            qcstatus[geneId][parameter] !== undefined) {
            switch (qcstatus[geneId][parameter]) {
                case 0:
                    status = 'done';
                    msg = 'QC checks at PhenoDCC did not find any issues';
                    break;
                case 1:
                    status = 'pending';
                    msg = 'Waiting for QC checks at PhenoDCC';
                    break;
                case 2:
                    status = 'issues';
                    msg = 'QC checks at PhenoDCC found possible issues';
                    break;
            }
            node.attr('title', msg).attr('class', 'qc-' + status);
        }
    }


    function addAssociatedMediaButton(target, geneId, gid, sid, cid, qeid) {
        var media = associatedMedia[geneId][qeid], q;
        if (media && media.k) {
            q = target.parameter;
            addDiv(target.select('.viz-svg-container'),
                null, 'show-media-button', 'Show media')
                .on('click', getImageViewerHandler('#content',
                    cid, gid, sid, media.k, "Associated media for "
                    + q.pn + ' - ' + q.n, media.n + ' - ' + media.k, qeid));
        }
    }

    function addBasketButton(target, geneId, qeid) {
        var handler = dcc.getVisualisationBasket(geneId, qeid);
        addDiv(target.select('.viz-svg-container'), null, handler.cls)
            .attr('title', handler.title)
            .on('click', handler.onclick);
    }

    /**
     * Visualise the measurements by instantiating a visualistion object, and
     * also update the QC status and the statistical annotations panel.
     * 
     * @param {Integer} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     */
    function visualiseData(id, target, gid, sid, cid, qeid) {
        target.classed('loading', false);
        target.viz = new Visualisation(id, target, gid, sid, cid, qeid, true);
        target.viz.refresh();
        var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
        updateQcStatus(geneId, qeid);
        addAssociatedMediaButton(target, geneId, gid, sid, cid, qeid);

        /* only allow addition of gene/parameter combination in preview mode */
        if (dcc.transientGeneParameter !== undefined)
            addBasketButton(target, geneId, qeid);

        displayMetadata(target, geneId, qeid);
        displayStatisticsInformation(target, gid, sid, cid, qeid);
    }

    /**
     * Split the measurements into zygosity groups. This is then used to
     * calculate zygosity specific statistical calculations.
     * 
     * @param {Object} data Array of measurements.
     * @returns {Object} Object that contains measurements in zygosity groups.
     */
    function groupMeasurementsByZygosity(data) {
        var datum, hom = [], het = [], hem = [], i = 0, c = data.length;
        while (i < c) {
            datum = data[i++];
            if (datum.g === 0) {
                het.push(datum);
                hom.push(datum);
                hem.push(datum);
            } else {
                switch (datum.z) {
                    case 0:
                        het.push(datum);
                        break;
                    case 1:
                        hom.push(datum);
                        break;
                    case 2:
                        hem.push(datum);
                }
            }
        }
        return {
            'het': het,
            'hom': hom,
            'hem': hem
        };
    }

    function processRawDataAndQcStatus(data, gid, sid, cid, qeid) {
        var measurementGroups,
            geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);

        /* set associated media */
        if (!associatedMedia[geneId])
            associatedMedia[geneId] = {};
        associatedMedia[geneId][qeid] = data.associatedMedia;

        /* update QC status */
        if (!qcstatus[geneId])
            qcstatus[geneId] = {};
        qcstatus[geneId][qeid] = data.qcStatus;

        /* last time when measurements were updated */
        if (!lastUpdate[geneId])
            lastUpdate[geneId] = {};
        lastUpdate[geneId][qeid] = data.lastUpdate;

        /* update metadata groups */
        if (!metadataGroups[geneId])
            metadataGroups[geneId] = {};
        metadataGroups[geneId][qeid] = {};
        metadataGroups[geneId][qeid].diffSet =
            prepareMetadataGroups(data.metadataGroups);
        metadataGroups[geneId][qeid].groups = data.metadataGroups;

        /* process without filtering for zygosity */
        if (!measurementsSet[ZYGOSITY_ALL][geneId])
            measurementsSet[ZYGOSITY_ALL][geneId] = {};
        measurementsSet[ZYGOSITY_ALL][geneId][qeid] =
            processMeasurements(data.measurements, gid, qeid);

        /* split data set by zygosity */
        measurementGroups =
            groupMeasurementsByZygosity(data.measurements);

        /* process heterozygous dataset */
        if (!measurementsSet[ZYGOSITY_HET][geneId])
            measurementsSet[ZYGOSITY_HET][geneId] = {};
        measurementsSet[ZYGOSITY_HET][geneId][qeid] =
            processMeasurements(measurementGroups.het, gid, qeid);

        /* process homozygous dataset */
        if (!measurementsSet[ZYGOSITY_HOM][geneId])
            measurementsSet[ZYGOSITY_HOM][geneId] = {};
        measurementsSet[ZYGOSITY_HOM][geneId][qeid] =
            processMeasurements(measurementGroups.hom, gid, qeid);

        /* process hemizygous dataset */
        if (!measurementsSet[ZYGOSITY_HEM][geneId])
            measurementsSet[ZYGOSITY_HEM][geneId] = {};
        measurementsSet[ZYGOSITY_HEM][geneId][qeid] =
            processMeasurements(measurementGroups.hem, gid, qeid);

    }

    /**
     * Retrieves raw measurements from the server and displays them in the
     * visualisation cluster. All calculations are also cached for future
     * references.
     * 
     * @param {Integr} id Visualisation identifier.
     * @param {Object} target Visualisation container DOM node.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Srain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     */
    function retrieveAndVisualiseData(id, target, gid, sid, cid, qeid) {
        d3.json('rest/measurements?includeBaseline=true' +
            '&cid=' + cid +
            '&gid=' + gid +
            '&sid=' + sid +
            '&qeid=' + qeid,
            function (data) {
                if (data && data.success) {
                    processRawDataAndQcStatus(data, gid, sid, cid, qeid);
                    visualiseData(id, target, gid, sid, cid, qeid);
                } else
                    displayNoDataWarning(target, qeid);
            });
    }

    function getImageViewerHandler(id, cid, gid, sid, qeid,
        xl, yl, filterKey) {
        return function () {
            d3.select('#sidebar').style('display', 'none');
            refitContent();
            var centre = centresMap[cid],
                geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
                gene = availableGenesMap[geneId];
            d3.select(id).append('div').attr('id', 'imageviewer');
            dcc.imageViewer = new dcc.ComparativeImageViewer('imageviewer',
                {
                    splitType: 'vertical',
                    title: '<span>' + centre.s + '</span>' +
                        '<span>' + gene.strain + '</span>' +
                        '<span>' + gene.alleleName + '</span>' +
                        '<span>' + xl + '</span>' + yl,
                    shortTitle: '<span>' + gene.alleleName + '</span>' + yl,
                    /* 'imageviewer' is an instance of
                     * 'phenodcc-imaging-display'
                     * project hosted on the same server as Phenoview. */
                    host: '/imageviewer/',
                    filter: filterKey, /* filter by associated parameter */
                    exitHandler: function () {
                        d3.select('#imageviewer').remove();
                        d3.select('#sidebar').style('display', 'block');
                        refitContent();
                    }
                });
            dcc.imageViewer.view(cid, gid, sid, qeid);
            if (highlightedSpecimen !== -1)
                dcc.imageViewer.selectSpecimen(highlightedSpecimen);
        };
    }

    function getImagingContextDetail(parameter) {
        var html = '<table><tbody>';
        html += '<tr><td>Procedure:</td><td>' +
            procedureKeyToProcedureDetailsMap[parameter[PROCEDURE_ID_FIELD][0]].n + '</td></tr>';
        html += '<tr><td>Parameter:</td><td>' + parameter[PARAMETER_NAME_FIELD] + '</td></tr>';
        html += '<tr><td>Parameter key:</td><td>' + parameter[PARAMETER_KEY_FIELD] + '</td></tr>';
        return html + '</tbody></table>';
    }

    function plotParameter(id, target) {
        var gid = target.gene,
            sid = target.strain,
            cid = target.centre,
            parameter = target.parameter,
            qeid = parameter[PARAMETER_KEY_FIELD],
            plotType = target.plotType,
            data, geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);

        if (plotType.t === STR_IMAGE) {
            target.classed('loading', false);
            target.append('div')
                .attr('class', 'image-viewer-context')
                .html(getImagingContextDetail(parameter));
            target.append('div')
                .attr('class', 'start-image-viewer')
                .text('Click to view media')
                .on('click', getImageViewerHandler('#content',
                    cid, gid, sid, qeid, plotType.l, plotType.yl));
        } else {
            if (dcc.imageViewer) {
                dcc.imageViewer.clear();
                dcc.imageViewer = null;
            }
            var embryoStage = null;
            if (qeid === undefined) {
                if (parameter.indexOf('OVERVIEWS_PAT') !== -1)
                    retrieveAndVisualiseGrossPathologyOverviews(id, target,
                        gid, sid, cid, qeid);
                if (parameter.indexOf('OVERVIEWS_ALZ') !== -1)
                    retrieveAndVisualiseLacZOverviews(id, target, gid, sid, cid);
                if (parameter.indexOf('OVERVIEWS_FER') !== -1)
                    retrieveAndVisualiseFertilityData(id, target, gid, sid,
                        cid, qeid);
                if (parameter.indexOf('OVERVIEWS_VIA') !== -1)
                    retrieveAndVisualiseViabilityData(id, target, gid, sid,
                        cid, qeid, null);
                if (parameter.indexOf('OVERVIEWS_GEP') !== -1)
                    retrieveAndVisualiseGrossMorphologyOverviews(id, target,
                        gid, sid, cid, 'OVERVIEWS_GEP');
                if (parameter.indexOf('OVERVIEWS_GPM') !== -1)
                    retrieveAndVisualiseGrossMorphologyOverviews(id, target,
                        gid, sid, cid, 'OVERVIEWS_GPM');
            } else {
                embryoStage = getEmbryoStage(qeid);
                if (embryoStage) {
                    retrieveAndVisualiseEmbryoViabilityData(id, target, gid,
                        sid, cid, qeid, embryoStage);
                } else {
                    /* do we have data for this genotype? */
                    if (measurementsSet[zygosity][geneId]) {
                        /* do we have data for this parameter */
                        data = measurementsSet[zygosity][geneId][qeid];
                        if (data)
                            visualiseData(id, target, gid, sid, cid, qeid);
                        else
                            retrieveAndVisualiseData(id, target, gid,
                                sid, cid, qeid);
                    } else
                        retrieveAndVisualiseData(id, target, gid, sid, cid, qeid);
                }
            }
        }
    }

    /**
     * Gets the bounded mouse coordinate.
     *
     * @param {Object} viz Visualisation object which has coordinate bounds.
     */
    function getBoundedMouseCoordinate(viz) {
        var dom = viz.container.node(), dim = dom.getBoundingClientRect(),
            screenMousePointerCoordinate = d3.mouse(dom),
            mouseX = screenMousePointerCoordinate[0],
            mouseY = screenMousePointerCoordinate[1],
            scale = viz.scale, xScale = scale.x, yScale = scale.y,
            xRange = xScale.range(), yRange = yScale.range(),
            rangeLowX = xRange[0], rangeHighX = xRange[1],
            rangeLowY = yRange[0], rangeHighY = yRange[1],
            boundedCoordX, boundedCoordY, isInside;

        /* x-coordinate increases left to right */
        boundedCoordX = mouseX < rangeLowX ? rangeLowX
            : mouseX > rangeHighX ? rangeHighX : mouseX;

        /* y-coordinate increases top to bottom */
        boundedCoordY = mouseY > rangeLowY ? rangeLowY
            : mouseY < rangeHighY ? rangeHighY : mouseY;

        /* is the mouse coordinate inside the bounded region */
        isInside = boundedCoordX === mouseX && boundedCoordY === mouseY;

        return {
            'isInside': isInside,
            'originX': dim.left,
            'originY': dim.top,
            'boundedCoordX': boundedCoordX,
            'boundedCoordY': boundedCoordY,
            'mouseX': mouseX,
            'mouseY': mouseY,
            'rangeLowX': rangeLowX,
            'rangeHighX': rangeHighX,
            'rangeLowY': rangeLowY,
            'rangeHighY': rangeHighY
        };
    }

    /**
     * Attaches an event handler which gets activated when the mouse moves
     * on top of the main SVG canvas. This will relocate the the infobox
     * near the mouse pointer, and also update the position of the crosshair.
     *
     * @param {Object} viz The visualisation object.
     *
     * @return {Object} The modified DOM element.
     */
    function svgMouseventHandler(viz) {
        var svg = viz.state.n.v, xhair = svg.xhair,
            extend = viz.dim.p * 1 / 4 - 1;
        svg.on('click', function () {
            hideInformationBox();
        })
            .on('mouseover',
                function () {
                    preventEventBubbling();
                    if (xhair)
                        xhair.style('opacity', 1);
                })
            .on('mouseout',
                function () {
                    preventEventBubbling();
                    if (xhair)
                        xhair.style('opacity', 0);
                })
            .on('mousemove',
                function () {
                    preventEventBubbling();
                    var bmc = getBoundedMouseCoordinate(viz);

                    if (xhair) {
                        /* position horizontal line */
                        xhair.horizontalLeft
                            .attr('x1', bmc.rangeLowX - extend)
                            .attr('x2', bmc.boundedCoordX - 5)
                            .attr('y1', bmc.boundedCoordY)
                            .attr('y2', bmc.boundedCoordY);
                        xhair.horizontalRight
                            .attr('x1', bmc.boundedCoordX + 5)
                            .attr('x2', bmc.rangeHighX + extend)
                            .attr('y1', bmc.boundedCoordY)
                            .attr('y2', bmc.boundedCoordY);

                        /* position vertical line */
                        xhair.verticalTop
                            .attr('x1', bmc.boundedCoordX)
                            .attr('x2', bmc.boundedCoordX)
                            .attr('y1', bmc.rangeHighY - extend)
                            .attr('y2', bmc.boundedCoordY - 5);
                        xhair.verticalBottom
                            .attr('x1', bmc.boundedCoordX)
                            .attr('x2', bmc.boundedCoordX)
                            .attr('y1', bmc.boundedCoordY + 5)
                            .attr('y2', bmc.rangeLowY + extend);
                    }
                });
        return svg;
    }

    /**
     * Draws a series using a onedimensional array of (x, y) values.
     *
     * @param {String} id Series identifier.
     * @param {Object[]} dataset A two dimensional array with the numerical
     *     data points.
     * @param {Function} getUnscaled Function that returns unscaled <b>x</b>
     *     and <b>y</b> values from the dataset.
     * @param {Object} viz The visualisation object.
     * @param {Object} svg The SVG DOM node to render to.
     * @param {Function} dataPointClickHandler Event handler for click events
     *     over a series data point.
     * @param {Boolean} displayDataPoint If <b>true</b>, display data points.
     * @param {Boolean} displaySeriesPolyline If <b>true</b>, display the
     *     series polyline.
     * @param {String} shape What shape to use for data point.
     * @param {Integer} size A single measure for the size of the shape in
     *     pixels; for instance, radius of the data point circle; or length of
     *     the side of a square.
     *
     * @return {Object} The modified DOM element.
     */
    function plotSeries(id, dataset, getUnscaled, viz, svg,
        dataPointClickHandler, displayDataPoint, displaySeriesPolyline,
        shape, size) {
        var seriesRootDom, i, polylinePoints,
            xScale = viz.scale.x, yScale = viz.scale.y,
            dataPoint, dataPointArray, t, displacement = 10;

        /* remove existing series plot group with the identifier */
        svg.select('.series.' + id).remove();

        /* append a new series plot group */
        seriesRootDom = svg.append('g').attr('class', 'series ' + id);

        /* prepare points for SVG polyline using series data points */
        polylinePoints = '';
        dataPointArray = [];
        for (i = 0; i < dataset.length; ++i) {
            t = getUnscaled(dataset[i]);

            /* don't plot point if y-value is undefined */
            if (t.y === null)
                continue;
            dataPoint = {
                e: t.e, /* metadata group */
                m: t.m, /* measurement id */
                a: t.a, /* animal id */
                x: t.x, /* unscaled values */
                y: t.y,
                sx: xScale(t.x), /* scaled values */
                sy: yScale(t.y)
            };
            dataPointArray.push(dataPoint);
            polylinePoints += dataPoint.sx + ',' + dataPoint.sy + ' ';
        }

        /* draw SVG polyline through all series data points */
        if (displaySeriesPolyline)
            seriesRootDom.append('polyline').attr('points', polylinePoints);

        /* draw the series data points */
        var db = seriesRootDom.selectAll('circle').data(dataPointArray);

        db.exit().remove(); /* remove existing points */

        /* show data points? */
        if (displayDataPoint) {
            switch (shape) {
                case 't': /* text symbol */
                    db.enter()
                        .append('text')
                        .attr('mg', function (d) {
                            return d.e; /* metadata group */
                        })
                        .attr('mid', function (d) {
                            return d.m; /* measurement id */
                        })
                        .attr('aid', function (d) {
                            return d.a; /* animal id */
                        })
                        .attr('x',
                            function (d) {
                                return d.sx;
                            })
                        .attr('y',
                            function (d) {
                                return d.sy;
                            })
                        .text(size)
                        .attr('class', function (d) {
                            return viz.state.q[d.m] ? 'selected' : null;
                        })
                        .on('click', dataPointClickHandler);
                    break;

                case 'c': /* draw circle */
                    db.enter()
                        .append('circle')
                        .attr('mg', function (d) {
                            return d.e; /* metadata group */
                        })
                        .attr('mid', function (d) {
                            return d.m; /* measurement id */
                        })
                        .attr('aid', function (d) {
                            return d.a; /* animal id */
                        })
                        .attr('r', size)
                        .attr('cx',
                            function (d) {
                                return d.sx;
                            })
                        .attr('cy',
                            function (d) {
                                return d.sy;
                            })
                        .attr('class', function (d) {
                            return viz.state.q[d.m] ? 'selected' : null;
                        })
                        .on('mouseup', function () {
                            preventEventBubbling();
                        })
                        .on('mousedown', function () {
                            preventEventBubbling();
                        })
                        .on('click', dataPointClickHandler);
                    break;

                case 's': /* draw square */
                    db.enter()
                        .append('rect')
                        .attr('mg', function (d) {
                            return d.e; /* metadata group */
                        })
                        .attr('mid', function (d) {
                            return d.m; /* measurement id */
                        })
                        .attr('aid', function (d) {
                            return d.a; /* animal id */
                        })
                        .attr('width', size * 2)
                        .attr('height', size * 2)
                        .attr('x',
                            function (d) {
                                return d.sx - size + displacement;
                            })
                        .attr('y',
                            function (d) {
                                return d.sy - size;
                            })
                        .attr('class', function (d) {
                            return viz.state.q[d.m] ? 'selected' : null;
                        })
                        .on('mouseup', function () {
                            d3.event.stopPropagation();
                        })
                        .on('mousedown', function () {
                            d3.event.stopPropagation();
                        })
                        .on('click', dataPointClickHandler);
                    break;
            }
        }
        return;
    }

    /**
     * Renders a swarm plot with the supplied data points.
     * 
     * @param {Object} dataset Set of data points to plot.
     * @param {Object} svg SVG container.
     * @param {String} cls Swarm class to group data points.
     * @param {Real} radius Radius of each data point.
     * @param {Function} onClick Data point on mouse click handler.
     */
    function plotSwarm(dataset, svg, cls, radius, onClick) {
        cls = 'swarm-' + cls;
        svg.select('.' + cls).remove();
        svg.append('g').attr('class', cls)
            .selectAll('circle')
            .data(dataset).enter()
            .append('circle')
            .attr('class',
                function (d) {
                    return d.s === 1 ? 'male' : 'female';
                })
            .attr('mg',
                function (d) {
                    return d.e; /* metadata group */
                })
            .attr('mid',
                function (d) {
                    return d.m; /* measurement id */
                })
            .attr('aid',
                function (d) {
                    return d.a; /* animal id */
                })
            .attr('r', radius)
            .attr('cx',
                function (d) {
                    return d.sx;
                })
            .attr('cy',
                function (d) {
                    return d.sy;
                })
            .on('click', onClick)
            .classed('highlight', function (d) {
                return d.a === highlightedSpecimen;
            });
    }

    /**
     * Show data point swarm.
     * 
     * @param {Object} viz Parent visualisation.
     * @param {Object} datapoints Datapoints on the same x-axis.
     * @param {String} cls Class for swarm group.
     * @param {Real} femaleAxis x-axis value for female vertical swarm axis.
     * @param {Real} maleAxis x-axis value for male vertical swarm axis.
     * @param {Real} radius Radius of a datapoint circle.
     */
    function showDatapointSwarm(viz, datapoints, cls,
        femaleAxis, maleAxis, radius) {
        var g, i, l, maleData = [], femaleData = [], datapoint, swarm,
            xScale = viz.scale.x, yScale = viz.scale.y,
            showMale = viz.isActiveCtrl('male'),
            showFemale = viz.isActiveCtrl('female'),
            onClick = getDatapointOnMouseClickHandler(viz);

        if (viz.isActiveCtrl('point')) {
            g = viz.state.n.v.append('g').attr('class', cls);
            for (i = 0, l = datapoints.length; i < l; ++i) {
                datapoint = datapoints[i].d[0];
                datapoint.sy = yScale(datapoint.y);
                if (isMaleDatapoint(datapoint)) {
                    if (showMale)
                        maleData.push(datapoint);
                    else
                        continue;
                } else {
                    if (showFemale)
                        femaleData.push(datapoint);
                    else
                        continue;
                }
            }

            swarm = new Beeswarm(maleData, xScale(maleAxis), radius);
            plotSwarm(swarm.swarm(0, SWARM_BOUND), g, 'male', radius, onClick);
            swarm = new Beeswarm(femaleData, xScale(femaleAxis), radius);
            plotSwarm(swarm.swarm(0, SWARM_BOUND), g, 'female',
                radius, onClick);
        }
    }

    /**
     * Highlights a specimen in all of the visualisations.
     * 
     * @param {type} animalId Specimen/animal identifier.
     */
    function highlightSpecimen(animalId) {
        /* clicking on the same specimen should select and highlight the 
         * specimen, or if the specimen is already selected, than unselect
         * the speciemen and cancel the highlighting */
        if (highlightedSpecimen === animalId)
            highlightedSpecimen = -1;
        else
            highlightedSpecimen = animalId;
        refreshVisualisationCluster(true);
    }

    /**
     * Returns a generic event handler that is activated when the mouse
     * is clicked over a data point.
     *
     * @param {Object} viz The visualisation object.
     */
    function getDatapointOnMouseClickHandler(viz) {
        return function (datapoint) {
            preventEventBubbling();
            highlightSpecimen(datapoint.a);
            relocateInformationBox(getBoundedMouseCoordinate(viz));
            d3.json('rest/specimens/' + datapoint.a,
                function (data) {
                    if (data.success === true) {
                        var datum = data.specimens[0];
                        if (datum === null || datum === undefined) {
                            informationBox
                                .html("Embryo specimen (details currently unavailable)");
                        } else {
                            var iconCls = prepareSex(datum.sex) + '-'
                                + prepareZygosity(datum.homozygous);
                            informationBox
                                .html(prepareInfo(datum, datapoint, viz.ptype))
                                .attr('class', iconCls);
                        }
                    }
                });
        };
    }

    function prepareMetadataGroups(mgs) {
        if (!mgs || mgs.length < 2)
            return {};

        var diffSet = {}, keyValues = {}, i, c, key;
        for (key in mgs[0].v) {
            keyValues[key] = {
                'c': 1, /* how many share the same key */
                'v': mgs[0].v[key] /* for value diff */
            };
        }
        for (i = 1, c = mgs.length; i < c; ++i) {
            for (key in mgs[i].v) {
                if (diffSet[key] === 1)
                    continue; /* key already marked as different */
                /* is this key appearing for the first time in this group? */
                else if (keyValues[key] === undefined)
                    diffSet[key] = 1; /* mark this key as different */
                else if (keyValues[key].v !== mgs[i].v[key])
                    diffSet[key] = 1; /* values are different */
                else
                    keyValues[key].c += 1; /* key found in metadata group */

            }
        }
        /* are any keys from the first group not in any of the others? */
        for (key in keyValues)
            if (diffSet[key] !== 1 && keyValues[key].c === 1)
                diffSet[key] = 1;
        return diffSet;
    }

    function prepareMetadataGroupInfo(data, diffSet) {
        var msg = "<table><tbody>", key;
        for (key in data)
            if (diffSet[key])
                msg += "<tr><td>" + key + "</td><td>" + data[key] + "</td></tr>";
        for (key in diffSet)
            if (data[key] === undefined)
                msg += "<tr><td>" + key + "</td><td>missing - not supplied</td></tr>";
        return msg + "</tbody></table>";
    }

    function getMetadataGroupFilter(metadataGroup, includeMatching) {
        return function (d, i) {
            return (d.e === metadataGroup && includeMatching) ||
                (d.e !== metadataGroup && !includeMatching);
        };
    }

    function setOpacityNonMetadataGroupDatapoints(viz, metadataGroup, opacity) {
        var svg = viz.state.n.v, i,
            filter = getMetadataGroupFilter(metadataGroup, false),
            isCategorical = viz.ptype.t === 'nominal',
            selectorSuffix = isCategorical ? '.categorical .datapoints rect'
            : '-datapoints ',
            selectors = [];

        if (!isCategorical) {
            /* scatter plot (wildtype is rectangle) */
            selectors.push('.wildtype' + selectorSuffix + 'rect');
            /* beeswarm plot (both mutant and wildtype are circles) */
            selectors.push('.wildtype' + selectorSuffix + 'circle');
            selectors.push('.mutant' + selectorSuffix + 'circle');
        } else
            selectors.push(selectorSuffix);

        for (i in selectors)
            svg.selectAll(selectors[i]).filter(filter)
                .attr('opacity', opacity);
    }

    function getMetadataGroupMouseOverHandler(viz, diffSet) {
        return function (metadataGroup) {
            preventEventBubbling();
            relocateInformationBox(getBoundedMouseCoordinate(viz));
            informationBox.html(prepareMetadataGroupInfo(metadataGroup.v, diffSet))
                .attr('class', 'metadata-group-info');
            setOpacityNonMetadataGroupDatapoints(viz, metadataGroup.i, 0.25);
        };
    }

    function getMetadataGroupMouseOutHandler(viz) {
        return function (metadataGroup) {
            preventEventBubbling();
            hideInformationBox();
            setOpacityNonMetadataGroupDatapoints(viz, metadataGroup.i, 1);
        };
    }

    /**
     * Prepare effective x-scale for use in plotting.
     * 
     * NOTE:
     * If all datapoints have the same x-value, artificially expand the
     * scale so that the data points are in the middle. Note that we need
     * four columns for female, female(WT), male and male(WT).
     * 
     * @param {String} type Data type of the x-values.
     * @param {Object} minX Minimum x-value for the data set.
     * @param {Object} maxX Maximum x-value for the data set.
     * @param {Integer} width Width of the visualisation (in pixels).
     * @param {Integer} padding Padding around plottable region (in pixels).
     */
    function prepareEffectiveXscale(type, minX, maxX, width, padding) {
        if (type === 'd') {
            if (minX.getTime() === maxX.getTime()) {
                minX = addDaysToDate(minX, -2); /* go back two days */
                maxX = addDaysToDate(maxX, 2); /* go forward two days */
            }
            return getTemporalScaler(minX, maxX, padding, width - padding);
        } else {
            if (minX === maxX) {
                minX -= 2;
                maxX += 2;
            }
            return getLinearScaler(minX, maxX, padding, width - padding);
        }
    }

    /**
     * Creates a series plot.
     *
     * @param {Object} viz The visualisation object.
     */
    function seriesPlot(viz) {
        var containerDomNode = viz.state.n.v,
            visualisationDimension = viz.chart.dim, padding = viz.dim.p,
            width = visualisationDimension.w, height = visualisationDimension.h,
            mt = viz.state.mutantStatistics.genderCombined.overall,
            minX = mt.x.min,
            minY = mt.y.min,
            maxX = mt.x.max,
            maxY = mt.y.max,
            wt = viz.state.wildtypeStatistics;

        /* if wild type is to be displayed, and if the statistics are defined */
        if (viz.isActiveCtrl('wildtype')) {
            wt =
                getOverallBaselineStatisticsBothGenders(wt, viz.gid);
            if (wt) {
                if (minX > wt.x.min)
                    minX = wt.x.min;
                if (minY > wt.y.min)
                    minY = wt.y.min;
                if (maxX < wt.x.max)
                    maxX = wt.x.max;
                if (maxY < wt.y.max)
                    maxY = wt.y.max;
            }
        }

        /* create the scales for converting data point values to the SVG screen
         * coordinates, and vice versa. */
        viz.scale.x = prepareEffectiveXscale(viz.ptype.xt,
            minX, maxX, width, padding);
        viz.scale.y = getLinearScaler(minY, maxY,
            height - padding, padding);

        /* visualise statistics */
        containerDomNode.selectAll('.ebar').remove();
        containerDomNode.selectAll('.stat').remove();
        viz.state.n.s = containerDomNode.append('g').attr('class', 'stat');
        viz.whisker();
        if (viz.isActiveCtrl('statistics')) {
            viz.stat('mean');
            viz.stat('median');
            viz.stat('max');
            viz.stat('min');
            viz.quartiles();
            viz.overallstat();
        }

        containerDomNode.selectAll('.mutant-datapoints').remove();
        containerDomNode.selectAll('.wildtype-datapoints').remove();
        viz.showDataPoints();

        if (viz.isActiveCtrl('shapes') && viz.type !== 'series')
            viz.legendsShapes();
        else
            viz.legends();
        viz.title();
        viz.xaxis();
        viz.yaxis();
        viz.crosshair();
        svgMouseventHandler(viz);
    }

    /**
     * Displays segment information when mouse if over a segment.
     *
     * @param {Object} viz The visualisation object.
     * @param {Object} data Contains category, percentage and labels.
     * @param {String} gender Gender information.
     */
    function onSegmentMouseOver(viz, data, gender) {
        gender = gender.toLowerCase();
        if (gender === 'no data' || gender === 'n')
            gender = '(gender - no data)';
        if (gender === 'm')
            gender = 'male';
        if (gender === 'f')
            gender = 'female';
        if (gender === 'i')
            gender = 'intersex';
        gender = ' ' + gender;
        var suffix = data.l + gender +
            ' specimens belong to the <b>' + data.c + '</b> category';
        d3.event.stopPropagation();
        relocateInformationBox(getBoundedMouseCoordinate(viz));
        informationBox.html('<b>' + data.p.toFixed(2) + '%</b> of ' + suffix +
            ', or<br><br><b>' + Math.round(data.p * data.t * 0.01) +
            '</b> out of <b>' + data.t + '</b> of ' + suffix)
            .attr('class', '');
    }

    /**
     * Follow the mouse when moving over a segment.
     * @param {Object} viz The visualisation object.
     */
    function onSegmentMouseMove(viz) {
        d3.event.stopPropagation();
        relocateInformationBox(getBoundedMouseCoordinate(viz));
    }

    /**
     * Convert category percentages to segmented column specifications.
     * 
     * @param {Real} datum Object with array of category percentages.
     * @param {Object} spec Specification of the segmented column container.
     * @returns {Object} Array of segmented column specifications.
     */
    function convertPercentagesToSegmentSpec(datum, spec) {
        var percentage, percentages = datum.s, category, segments = [],
            height = spec.ch * 0.01; /* converts percentage to height */

        for (category in percentages) {
            percentage = percentages[category];
            segments.push({
                'c': category,
                'p': percentage,
                'h': percentage * height,
                'y': 0,
                's': categoryColourIndex[category],
                'l': spec.l, /* grid label for segment detail */
                't': datum.t, /* total number of specimens */
                'g': datum.s
            });
        }
        return segments;
    }

    /**
     * Display total count and gender on top of segmented columns.
     * 
     * @param {Object} svg SVG node to attach label to.
     * @param {Integer} x x-coordinate of the middle of the column.
     * @param {Integer} y y-coordinate of the top of the column.
     * @param {Integer} count Number of specimens.
     * @param {String} label Label to diplay below the count.
     */
    function showSegmentedColumnTotalAndGender(svg, x, y, count, label) {
        text(svg, x, y - 4, count, 'segment-column-label');
        text(svg, x, y + 9, label, 'segment-column-label');
    }

    /**
     * Plots a segmented column with the supplied percentages.
     *
     * @param {Object} viz Visualisation object.
     * @param {Boolean} gender String for gender.
     * @param {Object} datum Category frequency total and percentages.
     * @param {Integer} x x-coordinate of segmented column bottom-left.
     * @param {Integer} y y-coordinate of segmented column bottom-left.
     * @param {Object} spec Specification for plotting each grid cell.
     */
    function plotSegmentColumn(viz, gender, datum, x, y, spec) {
        var svg = viz.state.n.s, i, c, db, width = spec.cw,
            segments = convertPercentagesToSegmentSpec(datum, spec);

        c = segments.length;
        if (c > 0) {
            /* sort the data by category */
            segments.sort(getComparator('c'));

            /* set segment height and y-coordinate of top-left corner */
            segments[0].y = y - segments[0].h;
            for (i = 1, c = segments.length; i < c; ++i)
                segments[i].y = segments[i - 1].y - segments[i].h;

            showSegmentedColumnTotalAndGender(svg,
                x + 0.5 * width,
                segments[c - 1].y - .5 * spec.tp,
                datum.t, gender);
        }

        /* plot a segment for each category percentage */
        svg = svg.append('g').attr('class', 'category-grid');
        db = svg.selectAll('rect').data(segments);
        db.exit().remove();
        db.enter().append('rect')
            .attr('x', x)
            .attr('y', function (d) {
                return d.y;
            })
            .attr('width', width)
            .attr('height', function (d) {
                return d.h;
            })
            .attr('class', function (d) {
                return 'segment-' + d.s;
            })
            .on('mouseover', function (d) {
                onSegmentMouseOver(viz, d, gender);
            })
            .on('mousemove', function (d) {
                onSegmentMouseMove(viz);
            })
            .on('mouseout', function (d) {
                informationBox.classed('hidden', true);
            });
    }
    /**
     * Creates a swarm plot of scatter data.
     *
     * @param {Object} viz The visualisation object.
     */
    function swarmPlot(viz) {
        var containerDomNode = viz.state.n.v,
            visualisationDimension = viz.chart.dim, padding = viz.dim.p,
            width = visualisationDimension.w, height = visualisationDimension.h,
            mt = viz.state.mutantStatistics.genderCombined.overall,
            minX = mt.x.min,
            minY = mt.y.min,
            maxX = mt.x.max,
            maxY = mt.y.max,
            wt = viz.state.wildtypeStatistics;

        /* if the wild type statistics is defined, fix x and y scales */
        wt = getOverallBaselineStatisticsBothGenders(wt);
        if (wt !== undefined) {
            /* if wild type should be displayed, adjust y-axis */
            if (viz.isActiveCtrl('wildtype')) {
                if (minY > wt.y.min)
                    minY = wt.y.min;
                if (maxY < wt.y.max)
                    maxY = wt.y.max;
            }
            /* keep the x-axis as it is: don't exclude wildtype */
            if (minX > wt.x.min)
                minX = wt.x.min;
            if (maxX < wt.x.max)
                maxX = wt.x.max;
        }

        /* create the scales for converting data point values to the SVG screen
         * coordinates, and vice versa. */
        viz.scale.x = prepareEffectiveXscale(viz.ptype.xt,
            minX, maxX, width, padding);
        viz.scale.y = getLinearScaler(minY, maxY,
            height - padding, padding);

        /* render the statistics first; but remove existing DOM nodes that are
         * related to statistics visuals */
        containerDomNode.selectAll('.ebar').remove();
        containerDomNode.selectAll('.stat').remove();
        var xScale = viz.scale.x, range = xScale.range(),
            swarmWidth = (range[1] - range[0]) / 16,
            scaledMutantFemaleAxis = swarmWidth + range[0],
            scaledWildtypeFemaleAxis = swarmWidth * 4 + range[0],
            scaledMutantMaleAxis = swarmWidth * 8 + range[0],
            scaledWildtypeMaleAxis = swarmWidth * 12 + range[0],
            mutantFemaleAxis = xScale.invert(scaledMutantFemaleAxis),
            wildtypeFemaleAxis = xScale.invert(scaledWildtypeFemaleAxis),
            mutantMaleAxis = xScale.invert(scaledMutantMaleAxis),
            wildtypeMaleAxis = xScale.invert(scaledWildtypeMaleAxis),
            swarmLabelY = height - .75 * padding,
            isWildtype = viz.gid === 0;

        viz.state.n.s = containerDomNode.append('g').attr('class', 'stat');

        if (viz.isActiveCtrl('female') && viz.state.mutantStatistics.female)
            text(viz.state.n.s, scaledMutantFemaleAxis,
                swarmLabelY, 'Female', 'swarm-label');
        if (!isWildtype && viz.isActiveCtrl('wildtype') &&
            viz.isActiveCtrl('female') &&
            viz.state.wildtypeStatistics.female &&
            viz.state.wildtypeStatistics.female.overall)
            text(viz.state.n.s, scaledWildtypeFemaleAxis,
                swarmLabelY, 'Female (WT)', 'swarm-label');
        if (viz.isActiveCtrl('male') && viz.state.mutantStatistics.male)
            text(viz.state.n.s, scaledMutantMaleAxis,
                swarmLabelY, 'Male', 'swarm-label');
        if (!isWildtype && viz.isActiveCtrl('wildtype') &&
            viz.isActiveCtrl('male') &&
            viz.state.wildtypeStatistics.male &&
            viz.state.wildtypeStatistics.male.overall)
            text(viz.state.n.s, scaledWildtypeMaleAxis,
                swarmLabelY, 'Male (WT)', 'swarm-label');

        if (viz.isActiveCtrl('whisker')) {
            if (viz.isActiveCtrl('female')) {
                if (viz.state.mutantStatistics.female
                    && viz.state.mutantStatistics.female.overall)
                    plotBoxAndWhisker('mutant-female-swarm', viz,
                        viz.state.mutantStatistics.female.overall.y,
                        mutantFemaleAxis, 0, 60,
                        isWildtype ? 'wildtype' : 'mutant');

                if (!isWildtype && viz.isActiveCtrl('wildtype') &&
                    viz.state.wildtypeStatistics.female &&
                    viz.state.wildtypeStatistics.female.overall)
                    plotBoxAndWhisker('wildtype-female-swarm', viz,
                        viz.state.wildtypeStatistics.female.overall.y,
                        wildtypeFemaleAxis, 0, 60, 'wildtype');
            }
            if (viz.isActiveCtrl('male')) {
                if (viz.state.mutantStatistics.male
                    && viz.state.mutantStatistics.male.overall)
                    plotBoxAndWhisker('mutant-male-swarm', viz,
                        viz.state.mutantStatistics.male.overall.y,
                        mutantMaleAxis, 0, 60,
                        isWildtype ? 'wildtype' : 'mutant');

                if (!isWildtype && viz.isActiveCtrl('wildtype') &&
                    viz.state.wildtypeStatistics.male &&
                    viz.state.wildtypeStatistics.male.overall)
                    plotBoxAndWhisker('wildtype-male-swarm', viz,
                        viz.state.wildtypeStatistics.male.overall.y,
                        wildtypeMaleAxis, 0, 60, 'wildtype');
            }
        }

        if (viz.isActiveCtrl('statistics')) {
            viz.overallstat();
        }

        /* show all of the wild type data points */
        containerDomNode.selectAll('.wildtype-datapoints').remove();
        if (!isWildtype && viz.isActiveCtrl('wildtype'))
            viz.showBaselineDatapointSwarm(wildtypeFemaleAxis,
                wildtypeMaleAxis);

        /* show all of the mutant data points */
        containerDomNode.selectAll('.mutant-datapoints').remove();
        viz.showMutantDatapointSwarm(mutantFemaleAxis, mutantMaleAxis);

        viz.legends();
        viz.title();
        viz.yaxis();
        viz.crosshair();
        svgMouseventHandler(viz);
    }

    /**
     * Calculates specification for plotting a grid column.
     *
     * @param {Integer} width Width of a grid cell.
     * @param {Integer} height Height of a grid cell.
     *
     * @returns {Object} Specification for plotting each grid cell.
     */
    function calculateColumnPlotSpecification(width, height) {
        var dx = width * 0.1,
            horizontalCellMiddle = width * 0.5,
            barX = dx * 0.5,
            barWidth = width - 2 * dx,
            barMiddle = horizontalCellMiddle * 0.5,
            bottomPadding = 25,
            topPadding = 40,
            barY = height - bottomPadding,
            columnHeight = height - bottomPadding - topPadding;
        return {
            'dx': dx,
            'cm': horizontalCellMiddle,
            'cw': barWidth,
            'ch': columnHeight,
            'tp': topPadding,
            'bp': bottomPadding,
            'bx': barX,
            'by': barY,
            'bw': barWidth,
            'bm': barMiddle
        };
    }

    /**
     * Plots two segmented bar charts, one for male and the other for female.
     *
     * @param {Object} viz Visualisation object.
     * @param {Object} femaleFreq Category frequency and percentages of female.
     * @param {Object} maleFreq Category frequency and percentages of male.
     * @param {Object} intersexFreq Category frequency and percentages of intersex.
     * @param {Object} nogenderFreq Category frequency and percentages of no gender.
     * @param {Integer} x x-coordinate of cell visualisation top-left.
     * @param {Integer} y y-coordinate of cell visualisation top-left.
     * @param {Object} spec Specification for plotting each grid cell.
     * @param {String} label Grid cell label.
     */
    function plotFrequencyColumnCell(viz, femaleFreq, maleFreq, intersexFreq,
        nogenderFreq, x, y, spec, label) {
        var svg = viz.state.n.s, numColumns = 0,
            tx = x + spec.dx, ty = y + spec.by, abbreviate = false;

        /* horizontal reference bar from which the segments are grown */
        line(svg, tx, ty, tx + spec.bw, ty, 'grid-bar');

        /* grid cell label */
        text(svg, x + spec.cm, ty + 15, label, 'category-grid-label');

        /* pass the grid label for segment detail */
        spec.l = label.toLowerCase();

        if (femaleFreq.t > 0) {
            ++numColumns;
        }
        if (maleFreq.t > 0) {
            ++numColumns;
        }
        if (intersexFreq.t > 0) {
            ++numColumns;
        }
        if (nogenderFreq.t > 0) {
            ++numColumns;
        }

        spec.cw = (spec.bw - (numColumns - 1) * spec.dx) / numColumns;
        if (spec.cw < 37)
            abbreviate = true;

        if (femaleFreq.t > 0) {
            /* plot female segmented column */
            plotSegmentColumn(viz, abbreviate ? 'F' : 'Female',
                femaleFreq, tx, ty, spec);
            tx += spec.cw + spec.dx;
        }
        if (maleFreq.t > 0) {
            /* plot male segmented column */
            plotSegmentColumn(viz, abbreviate ? 'M' : 'Male',
                maleFreq, tx, ty, spec);
            tx += spec.cw + spec.dx;
        }
        if (intersexFreq.t > 0) {
            /* plot intersex segmented column */
            plotSegmentColumn(viz, abbreviate ? 'I' : 'Intersex',
                intersexFreq, tx, ty, spec);
            tx += spec.cw + spec.dx;
        }
        if (nogenderFreq.t > 0) {
            /* plot no data segmented column */
            plotSegmentColumn(viz, abbreviate ? 'N' : 'No data',
                nogenderFreq, tx, ty, spec);
        }
    }

    /**
     * Plots the two-dimensional array of frequency columns.
     *
     * @param {Object} viz Visualisation object.
     * @param {Object} freqGrid Frequency grid with category frequencies.
     * @param {Integer} x x-coordinate of grid top-left.
     * @param {Integer} y y-coordinate of grid top-left.
     * @param {Integer} width Width of a grid cell.
     * @param {Integer} height Height of a grid cell.
     */
    function plotFrequencyColumns(viz, freqGrid, x, y, width, height) {
        var spec = calculateColumnPlotSpecification(width, height),
            svg = viz.state.n.s;

        rect(svg, x, y, 4 * width,
            height, 'mutant-categorical-split');

        /*
         *                  Het    Hom     Hem    All
         *        Female  (0, 0)  (0, 1)  (0,2)  (0, 3)
         *          Male  (1, 0)  (1, 1)  (1,2)  (1, 3)
         *      Intersex  (2, 0)  (2, 1)  (2,2)  (2, 3)
         *       No data  (3, 0)  (3, 1)  (3,2)  (3, 3)
         *           All  (4, 0)  (4, 1)  (4,2)  (4, 3)
         */

        /* plot heterozygous */
        plotFrequencyColumnCell(viz,
            freqGrid[0][0].mutantStatistics, /* mutant heterozygous female */
            freqGrid[1][0].mutantStatistics, /* mutant heterozygous male */
            freqGrid[2][0].mutantStatistics, /* mutant heterozygous intersex */
            freqGrid[3][0].mutantStatistics, /* mutant heterozygous no data */
            x, y, spec, 'Het', false);

        /* plot homozygous */
        x += width;
        plotFrequencyColumnCell(viz,
            freqGrid[0][1].mutantStatistics, /* mutant homozygous female */
            freqGrid[1][1].mutantStatistics, /* mutant homozygous male */
            freqGrid[2][1].mutantStatistics, /* mutant homozygous intersex */
            freqGrid[3][1].mutantStatistics, /* mutant homozygous no data */
            x, y, spec, 'Hom', false);

        /* plot hemizygous */
        x += width;
        plotFrequencyColumnCell(viz,
            freqGrid[0][2].mutantStatistics, /* mutant hemizygous female */
            freqGrid[1][2].mutantStatistics, /* mutant hemizygous male */
            freqGrid[2][2].mutantStatistics, /* mutant hemizygous intersex */
            freqGrid[3][2].mutantStatistics, /* mutant hemizygous no data */
            x, y, spec, 'Hem', false);

        /* plot wild type */
        x += width;
        plotFrequencyColumnCell(viz,
            freqGrid[0][3].wildtypeStatistics, /* wild type female */
            freqGrid[1][3].wildtypeStatistics, /* wild type male */
            freqGrid[2][3].wildtypeStatistics, /* wild type intersex */
            freqGrid[3][3].wildtypeStatistics, /* wild type no data */
            x, y, spec, 'Wildtype', true);
    }

    /**
     * Calculates the number of rows and columns for a two-dimensional
     * grid that can hold the supplied number of data points.
     *
     * @param {Integer} n Number of data points to fit.
     * @param {Integer} width Width of the rectangular area to fill.
     * @param {Integer} height Height of the rectangular area to fill.
     *
     * @returns {Object} Number of rows, columns, and cell width and height.
     */
    function calculateDatapointGridDimension(n, width, height) {
        /* our aim is to fit all of the data points inside the last column
         * of the visualisation grid. But first, we must calculate the
         * aspect ratio of this visualisation area.
         *
         *     aspect_ratio = width / height
         *
         * if c denotes the number of data points per row, we must have
         *
         *    c * (c / aspect_ratio) >= number_of_data_points
         *
         * or, c >= sqrt(number_of_data_points * aspect_ratio)
         */
        var c = Math.ceil(Math.sqrt((n * width) / height)),
            r = Math.ceil(n / c);

        /* width and height for each data point */
        return {
            'r': r,
            'c': c,
            'w': Math.floor(width / c),
            'h': Math.floor(height / r)
        };
    }

    /**
     * Plots categorical option values for all of the data points.
     *
     * @param {Object} viz Visualisation object
     * @param {Array} data Data set to plot.
     * @param {Integer} x x-coordinate of cell visualisation top-left.
     * @param {Integer} y y-coordinate of cell visualisation top-left.
     * @param {Integer} width Width of the rectangular area.
     * @param {Integer} height Height of the rectangular area.
     * @param {Function} dataPointOnClickHandler Event handler for events
     *     when mouse is clicked on a data point.
     */
    function plotCategoricalDatapoints(viz, data, x, y, width, height,
        dataPointOnClickHandler) {
        var svg = viz.state.n.s, k = 0, tx, ty,
            n = data.length, dataPoint, dataPointArray = [],
            dim = calculateDatapointGridDimension(n, width, height),
            c = dim.c, w = dim.w, h = dim.h, xHigh = x + (c - 1) * w;

        tx = x;
        ty = y;
        while (k < n) {
            dataPoint = data[k++];
            dataPointArray.push({
                'e': dataPoint.e, /* metadata group */
                'm': dataPoint.m, /* the measurement id */
                'a': dataPoint.a, /* animal id */
                'n': dataPoint.n, /* animal name */
                'x': tx,
                'y': ty,
                'w': w, /* width */
                'h': h, /* height */
                'v': dataPoint.v /* category value */
            });

            tx += w;
            if (tx > xHigh) {
                ty += h; /* next row */
                tx = x;
            }
        }

        svg.selectAll('.datapoints').remove();
        svg = svg.append('g').attr('class', 'datapoints');
        var db = svg.selectAll('rect').data(dataPointArray);
        db.exit().remove();
        db.enter().append('rect')
            .attr('x',
                function (d) {
                    return d.x;
                })
            .attr('y',
                function (d) {
                    return d.y;
                })
            .attr('width',
                function (d) {
                    return d.w;
                })
            .attr('height',
                function (d) {
                    return d.h;
                })
            .attr('mg', function (d) {
                return d.e; /* metadata group */
            })
            .attr('mid',
                function (d) {
                    return d.m; /* measurement id */
                })
            .attr('aid',
                function (d) {
                    return d.a; /* animal id */
                })
            .attr('class',
                function (d) {
                    return 'segment-' + (d.a === highlightedSpecimen ? 0 :
                        categoryColourIndex[d.v]);
                })
            .on('click', dataPointOnClickHandler);

        /* display data point label */
        if (data[0])
            text(svg, x + width * 0.5, y - 10,
                (data[0].g === 0 ? 'Baseline' : 'Mutant') + ' data points grid',
                'categorical-datapoints');
    }

    /**
     * Display all of the legends.
     *
     * @param {Object} viz Visualisation object.
     * @param {Integer} x x-coordinate of legend top-left.
     * @param {Integer} y y-coordinate of legend top-left.
     * @param {Array} categories List of categories to display.
     */
    function displayCategoryLegends(viz, x, y, categories) {
        var svg = viz.state.n.s, label, count, category,
            legendsPerColumn = 5, ty = y, boxSize = 10, i, c;
        count = legendsPerColumn;
        for (i = 0, c = categories.length; i < c; ++i) {
            category = categories[i];
            rect(svg, x, ty, boxSize, boxSize,
                'segment-' + categoryColourIndex[category]);
            label = category.icap();
            if (label.length > 24)
                label = label.substr(0, 24) + '...';
            text(svg, x + 2 * boxSize, ty + boxSize, label, 'segment-label');

            ty += boxSize * 2;
            if (--count === 0) {
                x += 180;
                ty = y;
                count = legendsPerColumn;
            }
        }
    }

    /**
     * Plots categorical data. The data itself is retrieved from the
     * cached measurements.
     * 
     * @param {type} viz The visualisation object.
     */
    function categoricalPlot(viz) {
        var containerDomNode = viz.state.n.v, state = viz.state,
            statistics = state.mutantStatistics,
            mutantData = state.mutantDataset,
            svg = state.n.v, vizDim = viz.chart.dim,
            padding = viz.dim.p, halfPadding = 0.5 * padding,
            width = vizDim.w - padding,
            height = vizDim.h - 2.3 * padding,
            /* divide the visualisation chart area into a 3x5 grid
             * 5th column cells are merged to display specific data point. the
             * rest of the grids display nine visualisations for each of the
             * following combinations:
             *
             *                  Het    Hom     Hem    All
             *        Female  (0, 0)  (0, 1)  (0,2)  (0, 3)
             *          Male  (1, 0)  (1, 1)  (1,2)  (1, 3)
             *      Intersex  (2, 0)  (2, 1)  (2,2)  (2, 3)
             *       No data  (3, 0)  (3, 1)  (3,2)  (3, 3)
             *           All  (4, 0)  (4, 1)  (4,2)  (4, 3)
             */
            cellWidth = Math.floor(width / 5);

        /* used for on mouse over events for data points */
        viz.scale.x = getLinearScaler(0, vizDim.w, 0, vizDim.w);
        viz.scale.y = getLinearScaler(0, vizDim.h, vizDim.h, 0);

        /* root SVG node for plotting */
        containerDomNode.selectAll('.categorical').remove();
        viz.state.n.s = svg = svg.append('g').attr('class', 'categorical');

        plotFrequencyColumns(viz, statistics.freqGrid,
            padding * 0.25, 1.75 * padding, cellWidth, height);

        plotCategoricalDatapoints(viz, mutantData,
            halfPadding + 4 * cellWidth, 2 * padding,
            cellWidth, height, getDatapointOnMouseClickHandler(viz));

        displayCategoryLegends(viz, halfPadding, halfPadding,
            statistics.categories);
        viz.title(); /* show title of the visualisation */
        svgMouseventHandler(viz);
    }

    /**
     * Returns a plotting type for a parameter object.
     *
     * <p>The parameters web service returns a JSON string that contains an
     * array of parameter objects for the supplied procedure. Each of these
     * JSON objects have some of the following attributes:</p>
     *
     * <ul>
     * <li>p: procedure id</li>
     * <li>i: parameter id</li>
     * <li>e: parameter stable identifier</li>
     * <li>n: parameter name</li>
     * <li>s: sequence number in the list of parameters</li>
     * <li>d: datatype of the measured value</li>
     * <li>u: measurement unit</li>
     * <li>ii: increment identifier</li>
     * <li>im: increment minimum</li>
     * <li>it: increment type</li>
     * <li>iu: increment unit</li>
     * <li>iv: increment value</li>
     * </ul>
     *
     * <p>The returned object has the following attributes:</p>
     *
     * <ul>
     * <li>t: type of the graph/plot to use. The types are given below</li>
     * <li>xc: string-to-value convertor function to use on x-axis</li>
     * <li>yc: string-to-value convertor function to use on y-axis</li>
     * <li>xl: label for the x-axis</li>
     * <li>xt: type of x-axis value</li>
     * <li>yl: label for the y-axis</li>
     * <li>l: chart title</li>
     * </ul>
     *
     * <p>The recognised string codes for graph/plot types are:</pCo>
     *
     * <ul>
     * <li>noplot: Do not plot (unplottable data)</li>
     * <li>point: Single point plot</li>
     * <li>series: Series plot (points and lines)</li>
     * <li>scatter: Scattor plot.</li>
     * </ul>
     *
     * @param {Object} parameter Parameter object.
     *
     * @return The plotting type that is appropriate for the parameter.
     */
    function determinePlotType(parameter) {
        var plotType = {};
        if (!parameter)
            plotType = null; /* invalid parameter */
        else {
            if (parameter.d === null || parameter.d === undefined) {
                /* don't plot: no data type available for conversion */
                plotType.t = 'noplot';
            } else {
                plotType.l = procedureKeyToProcedureDetailsMap[parameter.p[0]].n; /* procedure name */

                /* some strings values in the database are not trimmed */
                parameter.d = parameter.d.trim(); /* data Ftype */

                if (parameter.d === 'TEXT') {
                    switch (parameter.t) {
                        case 0:
                            plotType.t = 'meta';
                            break;
                        case 3: /* categorical data set */
                            plotType.t = 'nominal';
                            plotType.yl = parameter.n.icap();
                            break;
                    }
                } else {
                    /* unit of measurement */
                    parameter.u = parameter.u ? parameter.u.trim() : null;

                    if (parameter.d.length === 0 || 'NULL' === parameter.d) {
                        if (parameter.u === null || parameter.u.length === 0) {
                            /* don't plot: no data type or unit */
                            plotType.t = 'noplot';
                        } else {
                            /* assume float if unit is specified */
                            parameter.d = 'float';
                            plotType = getLabelsAndConvertors(parameter);
                        }
                    } else
                        plotType = getLabelsAndConvertors(parameter);
                }
            }

            if (parameter.d === 'IMAGE') {
                plotType.t = 'image';
            }
        }
        return plotType;
    }

    /**
     * Determine plot type, axis labels and data convertors.
     *
     * @param parameter Parameter object.
     * @return The plot type, data convertors and axis labels.
     */
    function getLabelsAndConvertors(parameter) {
        /* initialise with convertor function for measurement values
         * and the parameter name */
        var plotType = {
            yt: getYValueType(parameter.d),
            yc: getDataConvertor(parameter.d),
            yl: parameter.n,
            l: procedureKeyToProcedureDetailsMap[parameter.p[0]].n /* procedure name */
        };

        /* prepare y-axis label (append unit if present) */
        plotType.yl += !parameter.u || parameter.u.length < 1 ?
            '' : ' (' + parameter.u + ')';

        /* is there an increment? */
        if (parameter.ii) {
            parameter.it = parameter.it ? parameter.it.trim() : null;
            parameter.iu = parameter.iu ? parameter.iu.trim() : null;

            switch (parameter.it) {
                case 'float':
                    /* if unit is minutes, plot as series; otherwise, scatter */
                    if ('minutes' === parameter.iu ||
                        'seconds' === parameter.iu) {
                        plotType.t = 'series';
                        plotType.xt = 'i';
                    } else {
                        plotType.t = 'scatter';
                        plotType.xt = 'f';
                    }

                    /* convertor function for increment values */
                    plotType.xc = getDataConvertor(parameter.it);
                    plotType.xl = parameter.iu; /* prepare x-axis label */
                    break;

                case 'repeat':
                    plotType.t = 'series'; /* plot as series */
                    plotType.xl = parameter.iu; /* prepare x-axis label */

                    /* convertor function for increment values */
                    switch (parameter.iu) {
                        case 'number':
                        case 'Age In Days':
                            plotType.xc = getDataConvertor('integer');
                            plotType.xt = 'i';
                            break;

                        case 'Time in hours relative to lights out':
                            plotType.xc = getDataConvertor('float');
                            plotType.xt = 'f';
                            break;

                        default:
                            plotType.xc = getDataConvertor('float');
                            plotType.xt = 'f';
                    }
                    break;

                case 'datetime':
                    plotType.t = 'series'; /* plot as series */
                    plotType.xl = parameter.iu; /* prepare x-axis label */

                    /* convertor function for increment values */
                    switch (parameter.iu) {
                        case 'Time in hours relative to lights out':
                            plotType.xc = getDataConvertor('float');
                            plotType.xt = 'f';
                            break;

                        default:
                            plotType.xt = 'd';
                            plotType.xc = getDataConvertor('date/time');
                            plotType.xl = "Experiment date";
                    }
                    break;
            }

            /* make first character uppercase */
            if (plotType.xl)
                plotType.xl = plotType.xl.icap();
        } else {
            plotType.t = 'point';

            /* if there are no increments, the experiment start date gives
             * the x-axis values, and these are date values. */
            plotType.xt = 'd';
            plotType.xc = getDataConvertor('date/time');
            plotType.xl = "Experiment date";
        }
        if (plotType.yl)
            plotType.yl = plotType.yl.icap();

        /**
         * Special case for dervied parameter: Body weight
         */
        if (parameter.e === 'IMPC_BWT_001_001') {
            plotType.t = 'series';
            plotType.xl = 'Age In Weeks';
            plotType.xc = getDataConvertor('float');
            plotType.xt = 'f';
        }

        return plotType;
    }

    function getYValueType(datatype) {
        switch (datatype) {
            case 'INT':
                return 'i';

            case 'DATETIME':
                return 'd';

            case 'TEXT':
                return 't';
            case 'FLOAT':
            default:
                return 'f';

        }
    }

    /**
     * Returns a function that converts a string to an appropriate data type.
     *
     * @param {String} datatype Data type for conversion from string.
     * @return A convertor function.
     */
    function getDataConvertor(datatype) {
        var convertor;
        switch (datatype) {
            case 'FLOAT':
            case 'float':
                convertor = function (d) {
                    return parseFloat(d);
                };
                break;

            case '1-n':
            case 'INT':
            case 'INTEGER':
            case 'integer':
                convertor = function (d) {
                    return parseInt(d, 10);
                };
                break;

            case 'date/time':
            case 'DATE/TIME':
                convertor = function (d) {
                    return new Date(d);
                };
                break;

            case 'TEXT':
            case 'text':
                convertor = function (d) {
                    return d;
                };
                break;

            default:
                convertor = function (d) {
                    return d;
                };
        }
        return convertor;
    }

    /**
     * Process the raw data that was retrieved from the server. This prepares
     * the data for statistical calculations.
     * 
     * @param {Object} data Raw data to process.
     * @param {Object} type Plot type that determines the manner of processing.
     * @returns {Array} Processed data ready for statistical calculations.
     */
    function processData(data, type) {
        var processed = [], i, c = data.length, datum, x, y, date,
            /* string-to-datatype convertors for x- and y-axis values */
            xc = type.xc, yc = type.yc;

        for (i = 0; i < c; ++i) {
            datum = data[i];
            date = new Date(datum.d); /* measurement date */

            /* x-axis stores the increment value. if undefined, take the
             * measurement date and increment value. */
            x = datum.i;
            if (x === undefined)
                x = date;
            else if (xc)
                x = xc(x); /* if convertor is defined, convert value */

            y = datum.v;
            if (y !== undefined && yc)
                y = yc(y);

            if (isFinite(x) || x instanceof Date)
                if (isFinite(y))
                    processed.push({
                        e: datum.e, /* metadata group */
                        m: datum.m, /* measurement id */
                        x: x, /* x-axis increments */
                        y: y, /* y-axis value */
                        d: date,
                        s: datum.s, /* sex */
                        z: datum.z, /* zygosity */
                        g: datum.g, /* genotype */
                        t: datum.t, /* strain id */
                        a: datum.a, /* animal identifier */
                        n: datum.n  /* animal name */
                    });
        }
        return processed;
    }

    var Visualisation = function (id, container, gid, sid, cid, qeid, useSharedControl) {
        this.id = id; /* identifies the visualisation (must be unique) */
        this.container = container;
        this.cid = cid;
        this.gid = gid;
        this.sid = sid;
        this.geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid);
        this.qeid = qeid;

        /* the dimensions of the visualisation, including controls */
        this.dim = {
            'w': getNodeDimension(container, 'width'),
            'h': getAspectHeight(getNodeDimension(container, 'width')),
            'p': 80
        };

        this.scale = {
            'x': null, /* x-axis scale */
            'y': null /* y-axis scale */
        };


        this.control = {
            'dim': {
                'w': 300, /* from CSS */
                'h': this.dim.h
            }
        };

        this.chart = {
            'dim': {
                'w': this.dim.w,
                'h': this.dim.h
            }
        };

        this.prop = {
            'y': 'y', /* measured value */
            'g': 'a', /* animal id */
            'i': 'm' /* measurement id */
        };

        if (useSharedControl === undefined) {
            this.isActiveCtrl = this.isSelfActiveCtrl;
            this.hasActiveCtrls = this.hasSelfActiveCtrls;
        } else {
            this.isActiveCtrl = this.isSharedActiveCtrl;
            this.hasActiveCtrls = this.hasSharedActiveCtrls;
        }

        this.state = {
            'n': {
                'v': container.append('div')
                    .attr('class', 'viz-svg-container')
                    .append('svg')
                    .attr('id', this.id + '-svg')
                    .attr('width', this.chart.dim.w)
                    .attr('height', this.chart.dim.h),
                'i': createFurtherDetailsPanel(container),
                'a': {}
            },
            'q': {},
            'o': {
                'series': 0,
                'point': 0
            }
        };
        this.init();
    };

    /**
     * Prototype definition for a visualisation object.
     */
    Visualisation.prototype = {
        /* reference to function that checks if a control is active. This
         * depends on whether a shared control is used. Set his reference
         * to isSelfActiveCtrl() when visualisation must use control settings
         * specific to the visualisation; otherwise, use isSharedActiveCtrl().
         */
        isActiveCtrl: null,
        isSelfActiveCtrl: function (k) {
            var me = this;
            return (me.state.o[me.type] & controlOptions[k]) > 0;
        },
        isSharedActiveCtrl: function (k) {
            return (dcc.visualisationControl & controlOptions[k]) > 0;
        },
        /* reference to function that checks if several controls are active.
         * This also depends on whether a shared control is used. Set this
         * reference to hasSelfActiveCtrl() when visualisation must use control
         * settings specific to the visualisation; otherwise, use
         * hasSharedActiveCtrl().
         */
        hasActiveCtrls: null,
        hasSelfActiveCtrls: function (controlsBitMap) {
            var me = this;
            return (me.state.o[me.type] & controlsBitMap) > 0;
        },
        hasSharedActiveCtrls: function (controlsBitMap) {
            return (dcc.visualisationControl & controlsBitMap) > 0;
        },
        retrieve: function () {
            var me = this, dataPoints = me.state.q, selected = [], i;
            for (i in dataPoints)
                selected.push(dataPoints[i].m);
            return selected;
        },
        refresh: function () {
            var me = this, state = me.state;

            state.n.v.selectAll('.viz-warning').remove();
            if (me.nodata ||
                state.mutantStatistics === undefined ||
                state.mutantStatistics.genderCombined === null) {
                var msg;

                switch (zygosity) {
                    case 1:
                        msg = 'Heterozygous';
                        break;
                    case 2:
                        msg = 'Homozygous';
                        break;
                    case 3:
                        msg = 'Hemizygous';
                        break;
                    default:
                        msg = 'all';
                }
                state.n.v.selectAll('g').remove();
                if (msg === 'all')
                    me.warn('No measurements found');
                else
                    me.warn('No measurements found for ' + msg + ' specimens');
                return;
            }

            if (me.type === 'point') {
                if (me.isActiveCtrl('swarm')) {
                    state.refreshFunction = swarmPlot;
                    state.n.v.select('.x-axis').remove();
                } else
                    state.refreshFunction = seriesPlot;
            }
            if (state.refreshFunction)
                state.refreshFunction(me);
            me.highlight();
            me.metadataGroups();
        },
        warn: function (msg) {
            var me = this, g = me.state.n.v, parent = me.container.node();
            d3.select(parent.parentNode)
                .select('.viz-tools').style('opacity', 0);
            text(g, me.chart.dim.w * .5,
                me.chart.dim.h * .5, msg, 'viz-warning');
        },
        title: function () {
            var me = this, g = me.state.n.v, t;
            g.select('.viz-title').remove();
            t = text(g, me.chart.dim.w * .5,
                me.dim.p * .35, '', 'viz-title');
            t.append('tspan').attr('class', 'title-gene-symbol')
                .text(availableGenesMap[me.geneId].geneSymbol + ' - ');
            g = availableParametersMap[me.qeid].em;
            if (g !== undefined && g !== 'Unrestricted')
                t.append('tspan')
                    .attr('class', 'embryo-stage')
                    .text(g + ' - ');
            if (visualisationWidth > ZOOM_SMALL)
                t.append('tspan').attr('class', 'title-procedure')
                    .text(me.label.t.p + ' - ');
            t.append('tspan').attr('class', 'title-parameter')
                .text(me.label.t.q);

        },
        legends: function () {
            var me = this, g = me.state.n.v, t, showBaselinePointLegend,
                x = me.dim.p * 0.75, y = me.dim.p - 20;
            g.select('.viz-legends').remove();

            t = g.append('g').attr('class', 'viz-legends');
            showBaselinePointLegend = me.isActiveCtrl('wildtype') &&
                me.type === "point";

            if (me.isActiveCtrl('point')) {
                if (me.isActiveCtrl('female')) {
                    circle(t, x, y, 5, 'female');
                    x += 10;
                    text(t, x, y + 5, 'Female');
                    x += 60;

                    if (showBaselinePointLegend) {
                        square(t, x, y - 10, 10, 'female');
                        x += 10;
                        text(t, x, y + 5, 'Female (WT)');
                        x += 90;
                    }
                }

                if (me.isActiveCtrl('male')) {
                    circle(t, x, y, 5, 'male');
                    x += 10;
                    text(t, x, y + 5, 'Male');
                    x += 45;

                    if (showBaselinePointLegend) {
                        square(t, x, y - 10, 10, 'male');
                        x += 10;
                        text(t, x, y + 5, 'Male (WT)');
                        x += 60;
                    }
                }

                if (highlightedSpecimen !== -1) {
                    if (me.type === 'series')
                        if (me.isActiveCtrl('polyline'))
                            x -= 5;
                        else
                            x -= 15;
                    circle(t, x + 15, y, 5, 'legend-highlighted');
                    if (me.type === 'series' && me.isActiveCtrl('polyline')) {
                        line(t, x, y, x + 30, y, 'legend-highlighted');
                        x += 35;
                    } else
                        x += 25;
                    text(t, x, y + 5, 'Highlighted');
                    x += 75;
                }
            }

            if (me.gid !== 0 && me.isActiveCtrl('whisker')) {
                rect(t, x, y - 5, 10, 10, 'whisker mutant');
                x += 15;
                text(t, x, y + 5, 'Mutant');
                x += 53;

                if (me.isActiveCtrl('wildtype')) {
                    rect(t, x, y - 5, 10, 10, 'whisker wildtype');
                    x += 15;
                    text(t, x, y + 5, 'Wild type');
                    x += 65;
                }
            }

            if (me.isActiveCtrl('statistics') && me.isActiveCtrl('polyline')) {
                /* We display a dotted wild type when any of the following
                 * controls is active:
                 *
                 * mean: 0x1
                 * median: 0x2
                 * max: 0x4
                 * min: 0x8
                 * quartile: 0x10
                 *
                 * Or'ing them gives 31.
                 */
                if (me.gid !== 0 && me.hasActiveCtrls(31)) {
                    if (me.isActiveCtrl('wildtype')) {
                        line(t, x, y, x + 30, y, 'wildtype');
                        x += 30;
                        text(t, x, y + 5, 'Wild type');
                        x += 65;
                    }
                }

                if (me.isActiveCtrl('min')) {
                    line(t, x, y, x + 20, y, 'min');
                    x += 25;
                    text(t, x, y + 5, 'Min');
                    x += 35;
                }
                if (me.isActiveCtrl('max')) {
                    line(t, x, y, x + 20, y, 'max');
                    x += 25;
                    text(t, x, y + 5, 'Max');
                    x += 35;
                }
                if (me.isActiveCtrl('mean')) {
                    line(t, x, y, x + 20, y, 'mean');
                    x += 25;
                    text(t, x, y + 5, 'Mean');
                    x += 40;
                }
                if (me.isActiveCtrl('median')) {
                    line(t, x, y, x + 20, y, 'median');
                    x += 25;
                    text(t, x, y + 5, 'Median');
                    x += 50;
                }
                if (me.isActiveCtrl('quartile')) {
                    line(t, x, y, x + 20, y, 'q1');
                    x += 25;
                    text(t, x, y + 5, 'Q1');
                    x += 25;
                    line(t, x, y, x + 20, y, 'q3');
                    x += 25;
                    text(t, x, y + 5, 'Q3');
                    x += 25;
                }
            }
        },
        legendsShapes: function () {
            var me = this, g = me.state.n.v, t, showBaselinePointLegend,
                x = me.dim.p * 0.75, y = me.dim.p - 20;
            g.select('.viz-legends').remove();

            t = g.append('g').attr('class', 'viz-legends');
            showBaselinePointLegend = me.isActiveCtrl('wildtype') &&
                me.type === "point";

            if (me.isActiveCtrl('point')) {
                if (me.isActiveCtrl('female')) {
                    text(t, x, y, me.getSymbol('mutant', 'female'), 'm-female');
                    x += 10;
                    text(t, x, y + 5, 'Female');
                    x += 60;

                    if (showBaselinePointLegend) {
                        text(t, x, y, me.getSymbol('wildtype', 'female'),
                            'wt-female');
                        x += 10;
                        text(t, x, y + 5, 'Female (WT)');
                        x += 90;
                    }
                }

                if (me.isActiveCtrl('male')) {
                    text(t, x, y, me.getSymbol('mutant', 'male'), 'm-male');
                    x += 10;
                    text(t, x, y + 5, 'Male');
                    x += 45;

                    if (showBaselinePointLegend) {
                        text(t, x, y, me.getSymbol('wildtype', 'male'),
                            'wt-male');
                        x += 10;
                        text(t, x, y + 5, 'Male (WT)');
                        x += 60;
                    }
                }

                if (highlightedSpecimen !== -1) {
                    if (me.type === 'series')
                        if (me.isActiveCtrl('polyline'))
                            x -= 5;
                        else
                            x -= 15;
                    circle(t, x + 15, y, 5, 'legend-highlighted');
                    if (me.type === 'series' && me.isActiveCtrl('polyline')) {
                        line(t, x, y, x + 30, y, 'legend-highlighted');
                        x += 35;
                    } else
                        x += 25;
                    text(t, x, y + 5, 'Highlighted');
                    x += 75;
                }
            }

            if (me.gid !== 0 && me.isActiveCtrl('whisker')) {
                rect(t, x, y - 5, 10, 10, 'whisker mutant');
                x += 15;
                text(t, x, y + 5, 'Mutant');
                x += 53;

                if (me.isActiveCtrl('wildtype')) {
                    rect(t, x, y - 5, 10, 10, 'whisker wildtype');
                    x += 15;
                    text(t, x, y + 5, 'Wild type');
                    x += 65;
                }
            }

            if (me.isActiveCtrl('statistics') && me.isActiveCtrl('polyline')) {
                /* We display a dotted wild type when any of the following
                 * controls is active:
                 *
                 * mean: 0x1
                 * median: 0x2
                 * max: 0x4
                 * min: 0x8
                 * quartile: 0x10
                 *
                 * Or'ing them gives 31.
                 */
                if (me.gid !== 0 && me.hasActiveCtrls(31)) {
                    if (me.isActiveCtrl('wildtype')) {
                        line(t, x, y, x + 30, y, 'wildtype');
                        x += 30;
                        text(t, x, y + 5, 'Wild type');
                        x += 65;
                    }
                }

                if (me.isActiveCtrl('min')) {
                    line(t, x, y, x + 20, y, 'min');
                    x += 25;
                    text(t, x, y + 5, 'Min');
                    x += 35;
                }
                if (me.isActiveCtrl('max')) {
                    line(t, x, y, x + 20, y, 'max');
                    x += 25;
                    text(t, x, y + 5, 'Max');
                    x += 35;
                }
                if (me.isActiveCtrl('mean')) {
                    line(t, x, y, x + 20, y, 'mean');
                    x += 25;
                    text(t, x, y + 5, 'Mean');
                    x += 40;
                }
                if (me.isActiveCtrl('median')) {
                    line(t, x, y, x + 20, y, 'median');
                    x += 25;
                    text(t, x, y + 5, 'Median');
                    x += 50;
                }
                if (me.isActiveCtrl('quartile')) {
                    line(t, x, y, x + 20, y, 'q1');
                    x += 25;
                    text(t, x, y + 5, 'Q1');
                    x += 25;
                    line(t, x, y, x + 20, y, 'q3');
                    x += 25;
                    text(t, x, y + 5, 'Q3');
                    x += 25;
                }
            }
        },
        xaxis: function () {
            var me = this, g = me.state.n.v;
            plotAxis('x', me, 'bottom', me.label.x);
        },
        yaxis: function () {
            var me = this, g = me.state.n.v;
            plotAxis('y', me, 'left', me.label.y);
        },
        errorbar: function (index) {
            var me = this, i,
                dataPoint, groupIdPrefix = 'group-' + index + '_',
                container = me.state.n.s, /* contains all statistics visuals */
                stat = getStatistics(me, true), /* get mutant statistics */
                seriesDataPoints = stat.r.r[index].d,
                numDataPoints = seriesDataPoints.length,
                deviationGetter = me.isActiveCtrl('std_err') ?
                getColumnStandardError : getColumnStandardDeviation;

            container.selectAll('.ebar').remove();
            for (i = 0; i < numDataPoints; ++i) {
                dataPoint = seriesDataPoints[i];
                plotErrorBar(groupIdPrefix + i, me,
                    dataPoint.x, dataPoint.y,
                    deviationGetter(stat, dataPoint.x), 10);
            }
        },
        whisker: function () {
            var me = this, i, temp,
                container = me.state.n.s, /* contains all statistics visuals */
                mutantStatistics = getStatistics(me, true),
                wildtypeStatistics = getStatistics(me, false),
                numColumnGroups, displacement = 0, width = 16;
            if (me.isActiveCtrl('whisker')) {
                if (me.isActiveCtrl('wildtype')
                    && wildtypeStatistics !== null) {
                    displacement = 40;
                    width = 16;

                    /* get column statistics for each x-axis value */
                    wildtypeStatistics = wildtypeStatistics.c.c;

                    /* show box and whisker plot for eachx-axis values */
                    numColumnGroups = wildtypeStatistics.length;
                    for (i = 0; i < numColumnGroups; ++i) {
                        temp = wildtypeStatistics[i];
                        plotBoxAndWhisker('group-' + i, me, temp.s, temp.k,
                            displacement, width, 'wildtype');
                    }

                    displacement = 18;
                }

                if (mutantStatistics !== null) {
                    /* get column statistics for each x-axis value */
                    mutantStatistics = mutantStatistics.c.c;

                    /* show box and whisker plot for each x-axis values */
                    numColumnGroups = mutantStatistics.length;
                    for (i = 0; i < numColumnGroups; ++i) {
                        temp = mutantStatistics[i];
                        plotBoxAndWhisker('group-' + i, me, temp.s, temp.k,
                            displacement, width,
                            me.gid === 0 ? 'wildtype' : 'mutant');
                    }
                }
            } else
                container.selectAll('.whisker').remove();
        },
        init: function () {
            var me = this, state = me.state, mutantData, wildtypeData,
                data = measurementsSet[zygosity][me.geneId][me.qeid];

            if (!data) {
                me.nodata = true;
                return;
            }

            me.nodata = false;
            mutantData = data.mutant;
            wildtypeData = data.wildtype;

            me.ptype = data.plottype;
            me.type = me.ptype.t;
            me.label = {
                't': {
                    'p': me.ptype.l,
                    'q': me.ptype.yl
                },
                'x': me.ptype.xl
            };

            state.mutantStatistics = mutantData.statistics;
            state.wildtypeStatistics = wildtypeData.statistics;
            state.mutantDataset = mutantData.dataset;
            state.wildtypeDataset = wildtypeData.dataset;

            switch (me.type) {
                case 'series':
                    me.prop.x = 'x'; /* attribute name for increment value */
                    state.refreshFunction = seriesPlot;
                    break;

                case 'point':
                    me.prop.x = 'd'; /* attribute name for increment value */
                    state.refreshFunction = swarmPlot;
                    break;

                case 'nominal':
                    state.refreshFunction = categoricalPlot;
                    break;

                default:
            }
        },
        stat: function (statisticsType) {
            var me = this, container = me.state.n.s;
            if (me.isActiveCtrl(statisticsType) && me.ptype.t === 'series') {
                var mt = getStatistics(me, true),
                    wt = getStatistics(me, false),
                    showDataPoints = me.isActiveCtrl('point'),
                    showPolyline = me.isActiveCtrl('polyline'),
                    /* function to retrieve unscaled data points */
                    getData = function (d) {
                        return {
                            m: d.m,
                            a: d.a,
                            x: d.k,
                            y: d.s[statisticsType]
                        };
                    };

                /* show wildtype visual */
                if (me.isActiveCtrl('wildtype')
                    && wt !== null) {
                    plotSeries('wildtype-' + statisticsType, /* DOM id */
                        wt.c.c, /* column statistics: for all x-axis values */
                        getData, /* function for retrieving data from record */
                        me, /* use this visualisation object for rendering */
                        container, /* where to render to */
                        null, /* click event-handler (curretly not used) */
                        showDataPoints, /* should we display data point */
                        showPolyline, /* should we display ployline */
                        'c', /* draw circle */
                        STAT_DATAPOINT_RADIUS);
                }

                /* show mutant visual */
                if (mt !== null) {
                    plotSeries(statisticsType, /* DOM identifier */
                        mt.c.c, /* column statistics: for all x-axis values */
                        getData, /* function for retrieving data from record */
                        me, /* use this visualisation object for rendering */
                        container, /* where to render to */
                        null, /* click event-handler (curretly not used) */
                        showDataPoints, /* should we display data point */
                        showPolyline, /* should we display ployline */
                        'c', /* draw circle */
                        STAT_DATAPOINT_RADIUS);
                }
            } else
                container.selectAll('.' + statisticsType).remove();
        },
        bar: function (statisticsType) {
            var me = this, container = me.state.n.s;
            if (me.isActiveCtrl(statisticsType)) {
                var mt = getStatistics(me, true),
                    wt = getStatistics(me, false),
                    showDataPoints = me.isActiveCtrl('point'),
                    showPolyline = me.isActiveCtrl('polyline'),
                    /* function to retrieve unscaled data points */
                    getData = function (d) {
                        return {
                            m: d.m,
                            a: d.a,
                            x: d.k,
                            y: d.s[statisticsType]
                        };
                    };

                /* show wild type visual */
                if (me.isActiveCtrl('wildtype') && wt !== null) {
                    plotSeries('wildtype-' + statisticsType, /* DOM id */
                        wt.c.c, /* column statistics: for all x-axis values */
                        getData, /* function for retrieving data from record */
                        me, /* use this visualisation object for rendering */
                        container, /* where to render to */
                        null, /* click event-handler (currently not used) */
                        showDataPoints, /* should we display data point */
                        showPolyline, /* should we display ployline */
                        'c', /* draw circle */
                        3); /* radius of the data point circle in pixel */
                }

                /* show mutant visual */
                if (mt !== null) {
                    plotSeries(statisticsType, /* DOM identifier */
                        mt.c.c, /* column statistics: for all x-axis values */
                        getData, /* function for retrieving data from record */
                        me, /* use this visualisation object for rendering */
                        container, /* where to render to */
                        null, /* click event-handler (currently not used) */
                        showDataPoints, /* should we display data point */
                        showPolyline, /* should we display ployline */
                        'c', /* draw circle */
                        3); /* radius of the data point circle in pixel */
                }
            } else
                container.selectAll('.' + statisticsType).remove();
        },
        overallstat: function () {
            var me = this, mt, wt;
            if (me.type === 'point' && me.isActiveCtrl('polyline')) {
                mt = getStatistics(me, true);
                wt = getStatistics(me, false);
                if (wt && me.isActiveCtrl('wildtype'))
                    plotStatistics(me, wt.overall.y, 10, true);
                if (mt !== null)
                    plotStatistics(me, mt.overall.y, 10, false);
            }
        },
        quartiles: function () {
            var me = this, mt = getStatistics(me, true),
                wt = getStatistics(me, false),
                container = me.state.n.s; /* contains all statistics visuals */

            if (me.isActiveCtrl('quartile')) {
                var showDataPoints = me.isActiveCtrl('point'),
                    showPolyline = me.isActiveCtrl('polyline'),
                    showBaseline = me.isActiveCtrl('wildtype') &&
                    wt !== null;

                if (showBaseline) {
                    plotSeries('wildtype-q1', wt.c.c, getQ1,
                        me, container, null, showDataPoints,
                        showPolyline, 'c', STAT_DATAPOINT_RADIUS);
                    plotSeries('wildtype-q3', wt.c.c, getQ3,
                        me, container, null, showDataPoints,
                        showPolyline, 'c', STAT_DATAPOINT_RADIUS);
                }

                if (mt !== null) {
                    plotSeries('q1', mt.c.c, getQ1,
                        me, container, null, showDataPoints,
                        showPolyline, 'c', STAT_DATAPOINT_RADIUS);
                    plotSeries('q3', mt.c.c, getQ3,
                        me, container, null, showDataPoints,
                        showPolyline, 'c', STAT_DATAPOINT_RADIUS);
                }
            } else {
                container.selectAll('.q1').remove();
                container.selectAll('.q3').remove();
            }
        },
        showMutantDatapointSwarm: function (femaleAxis, maleAxis) {
            var me = this, statistics = getStatistics(me, true);
            showDatapointSwarm(me, statistics.r.r, 'mutant-datapoints',
                femaleAxis, maleAxis, me.gid === 0 ?
                wildtypeDatapointRadius : mutantDatapointRadius);
        },
        showBaselineDatapointSwarm: function (femaleAxis, maleAxis) {
            var me = this, statistics = getStatistics(me, false);
            if (statistics && statistics.r && statistics.r.r)
                showDatapointSwarm(me, statistics.r.r, 'wildtype-datapoints',
                    femaleAxis, maleAxis, wildtypeDatapointRadius);
        },
        showDataPoints: function () {
            var me = this, statistics, i, c, data,
                columnDataset, state, leaning = undefined;
            if (me.isActiveCtrl('point')) {
                if (me.type === 'series') {
                    statistics = getStatistics(me, true);
                    if (statistics && statistics.c)
                        data = statistics.c.c;
                    if (data)
                        for (i = 0, c = data.length; i < c; ++i) {
                            columnDataset = data[i];
                            me.swarm(columnDataset.d,
                                columnDataset.k, 'mutant');
                        }
                } else {
                    state = me.state;
                    if (me.gid !== 0 && me.isActiveCtrl('wildtype'))
                        me.scatter('wildtype',
                            filterByGender(state.wildtypeDataset, me),
                            me.isActiveCtrl('shapes') ? 't'
                            : 'r', wildtypeDatapointRadius);
                    me.scatter('mutant',
                        filterByGender(state.mutantDataset, me),
                        me.isActiveCtrl('shapes') ? 't'
                        : 'c', mutantDatapointRadius);
                }
            }
        },
        getSymbol: function (type, gender) {
            if (gender === 'male') {
                if (type === 'wildtype') {
                    return '★';
                } else {
                    return '▲';
                }
            } else {
                if (type === 'wildtype') {
                    return '+';
                } else {
                    return '■';
                }
            }
        },
        scatter: function (id, data, type, size) {
            var me = this, i, t, state = me.state, halfSize = 0.5 * size,
                xScale = me.scale.x, yScale = me.scale.y;

            for (i in data) {
                t = data[i];
                t.sx = xScale(t.x);
                t.sy = yScale(t.y);
            }

            switch (type) {
                case 't':
                    state.n.v.append('g').attr('class', id + '-datapoints')
                        .selectAll('text')
                        .data(data)
                        .enter()
                        .append('text')
                        .attr('class', function (d) {
                            return d.s === 1 ? 'male' : 'female';
                        })
                        .attr('mg', function (d) {
                            return d.e; /* metadata group */
                        })
                        .attr('mid', function (d) {
                            return d.m; /* measurement id */
                        })
                        .attr('aid', function (d) {
                            return d.a; /* animal id */
                        })
                        .attr('x',
                            function (d) {
                                return d.sx;
                            })
                        .attr('y',
                            function (d) {
                                return d.sy;
                            })
                        .text(function (d) {
                            return me.getSymbol(id, d.s === 1 ? 'male'
                                : 'female');
                        })
                        .classed('highlight', function (d) {
                            return d.a === highlightedSpecimen;
                        })
                        .on('click', getDatapointOnMouseClickHandler(me));
                    break;

                case 'c':
                    state.n.v.append('g').attr('class', id + '-datapoints')
                        .selectAll('circle')
                        .data(data)
                        .enter()
                        .append('circle')
                        .attr('class', function (d) {
                            return d.s === 1 ? 'male' : 'female';
                        })
                        .attr('mg', function (d) {
                            return d.e; /* metadata group */
                        })
                        .attr('mid', function (d) {
                            return d.m; /* measurement id */
                        })
                        .attr('aid', function (d) {
                            return d.a; /* animal id */
                        })
                        .attr('cx', function (d) {
                            return xScale(d.x);
                        })
                        .attr('cy', function (d) {
                            return yScale(d.y);
                        })
                        .attr('r', mutantDatapointRadius)
                        .classed('highlight', function (d) {
                            return d.a === highlightedSpecimen;
                        })
                        .on('click', getDatapointOnMouseClickHandler(me));
                    break;

                case 'r':
                    state.n.v.append('g').attr('class', id + '-datapoints')
                        .selectAll('rect')
                        .data(data)
                        .enter()
                        .append('rect')
                        .attr('class', function (d) {
                            return d.s === 1 ? 'male' : 'female';
                        })
                        .attr('mg', function (d) {
                            return d.e; /* metadata group */
                        })
                        .attr('mid', function (d) {
                            return d.m; /* measurement id */
                        })
                        .attr('aid', function (d) {
                            return d.a; /* animal id */
                        })
                        .attr('x', function (d) {
                            return xScale(d.x) - halfSize;
                        })
                        .attr('y', function (d) {
                            return yScale(d.y) - halfSize;
                        })
                        .attr('width', size)
                        .attr('height', size)
                        .on('click', getDatapointOnMouseClickHandler(me));
            }
        },
        swarm: function (dataset, x, type, leaning) {
            var me = this, state = me.state, g, i, c,
                radius = me.gid === 0 ?
                wildtypeDatapointRadius : mutantDatapointRadius,
                xScale = me.scale.x, yScale = me.scale.y, swarm;

            for (i = 0, c = dataset.length; i < c; ++i)
                dataset[i].sy = yScale(dataset[i].y);

            g = state.n.v.append('g').attr('class',
                type + '-datapoints group-' + x);
            swarm = new Beeswarm(dataset, xScale(x), radius);
            plotSwarm(swarm.swarm(leaning, SWARM_BOUND), g, type,
                radius, getDatapointOnMouseClickHandler(me));
        },
        highlightSeries: function () {
            var me = this, index, seriesDataPoints,
                containerDomNode = me.state.n.s,
                statistics = getStatistics(me, true);
            containerDomNode.select('.series.highlighted').remove();
            if (highlightedSpecimen !== -1 && statistics) {
                index = statistics.r.i[highlightedSpecimen];
                if (index !== undefined) {
                    seriesDataPoints = statistics.r.r[index];
                    if (seriesDataPoints !== undefined) {
                        plotSeries('highlighted',
                            seriesDataPoints.d,
                            function (d) {
                                return {
                                    e: d.e,
                                    m: d.m,
                                    a: d.a,
                                    x: d.x,
                                    y: d.y,
                                    s: d.s
                                };
                            },
                            me, containerDomNode,
                            getDatapointOnMouseClickHandler(me), false,
                            me.isActiveCtrl('polyline'), 'c',
                            STAT_DATAPOINT_RADIUS);
                    }
                }
            }
        },
        highlightDatapoint: function () {
            var me = this, containerDomNode = me.state.n.s;
            containerDomNode
                .selectAll('.highlight')
                .classed('highlight', false);
            if (me.isActiveCtrl('highlight') && highlightedSpecimen !== -1) {
                containerDomNode
                    .selectAll('[aid="' + highlightedSpecimen + '"]')
                    .classed('highlight', true);
            }
        },
        highlight: function () {
            var me = this;
            if (me.type === 'series')
                me.highlightSeries();
            else
                me.highlightDatapoint();
        },
        crosshair: function () {
            var me = this, containerDomNode;
            if (me.isActiveCtrl('crosshair'))
                renderCrosshair(me);
            else {
                containerDomNode = me.state.n.v;
                containerDomNode.selectAll('.xhair').remove();
                containerDomNode.on('mousemove', null);
            }
        },
        metadataGroups: function () {
            var me = this, containerDomNode = me.state.n.v,
                mg = metadataGroups[me.geneId][me.qeid], x = 1.5 * me.dim.p, d,
                radius = 12, distanceFromBottom = me.dim.h - .30 * me.dim.p,
                i = 0, g, textY = me.dim.h - .25 * me.dim.p;
            containerDomNode.selectAll('.metadata-group-label').remove();
            if (mg && mg.groups) {
                if (mg.groups.length > 1) {
                    text(containerDomNode, .25 * me.dim.p,
                        textY, 'Metadata split:', 'metadata-group-label');
                    d = containerDomNode.selectAll('.metadata-group')
                        .data(mg.groups);
                    g = d.enter().append('g')
                        .attr('class', 'metadata-group')
                        .on('mouseenter', getMetadataGroupMouseOverHandler(me,
                            mg.diffSet))
                        .on('mouseleave', getMetadataGroupMouseOutHandler(me));

                    g.append('circle')
                        .attr('cx', function (d) {
                            var cx = x;
                            x += 2.75 * radius;
                            return cx;
                        })
                        .attr('cy', distanceFromBottom)
                        .attr('r', radius);

                    i = 0;
                    x = 1.5 * me.dim.p;
                    g.append('text')
                        .attr('x', function (d) {
                            var cx = x;
                            x += 2.75 * radius;
                            return cx;
                        })
                        .attr('y', textY)
                        .text(function (d) {
                            return ++i;
                        });

                    d.exit().remove();
                }
            }
        }
    };

    function addInfobarEntry(tr, datum) {
        var centre = centresMap[datum.cid],
            cell = tr.append('td').append('div')
            .style("width", visualisationWidth + "px");

        cell.append('img').attr('class', 'tiny-logo')
            .attr('src', 'images/logo_' +
                centre.s + '.png');
        cell.append('div').attr('class', 'infobar-centre')
            .text(centre.s);
        cell.append('div').attr('class', 'infobar-strain')
            .text(datum.strain);
        cell.append('div').attr('class', 'infobar-allele')
            .node().innerHTML = datum.alleleName ?
            datum.alleleName : datum.geneSymbol;
        cell.append('a').attr('class', 'infobar-mgi')
            .attr('href', '../data/genes/' + datum.geneId)
            .attr('target', '_blank')
            .text(datum.geneId);
    }

    function showSingleGeneInfobar(parent) {
        var infobar, tr, temp = dcc.transientGeneParameter,
            datum = availableGenesMap[dcc.getGeneStrainCentreId(temp.gene)];
        infobar = addDiv(parent, 'infobar');
        tr = infobar.append('table').append('tr');
        addInfobarEntry(tr, datum);
        tr.append('td');
    }

    function showInfobar(parent) {
        var infobar, tr;
        if (geneList.count() > 0) {
            infobar = addDiv(parent, 'infobar');
            tr = infobar.append('table').append('tr');
            geneList.traverse(function (datum) {
                addInfobarEntry(tr, datum);
            });
            tr.append('td');
        } else
            listIsEmpty(parent);
    }

    function getSharedControlOnClickHandler(control, handler) {
        return function () {
            preventEventBubbling();
            var isOn, cls = control + '-', node = d3.select(this);
            dcc.visualisationControl ^= controlOptions[control];
            if (node.classed(cls + 'on')) {
                node.classed(cls + 'on', false);
                node.classed(cls + 'off', true);
                isOn = false;
            } else {
                node.classed(cls + 'on', true);
                node.classed(cls + 'off', false);
                isOn = true;
            }
            if (handler === undefined)
                refreshVisualisationCluster(true);
            else
                handler(isOn);
        };
    }

    function addControl(toolbar, type, tip, handler) {
        var control = addDiv(toolbar, null, 'control'),
            suffix = dcc.visualisationControl &
            controlOptions[type] ? '-on' : '-off';
        if (tip !== undefined)
            control.attr('title', tip);
        control.classed(type + suffix, true);
        if (isSupportedTouchDevice === null)
            control.on('click',
                getSharedControlOnClickHandler(type, handler));
        else
            control.on(TOUCH_START,
                getSharedControlOnClickHandler(type, handler));

        return control;
    }

    function getAnimatedWidthChanger(node, width) {
        return function () {
            preventEventBubbling();
            node.transition().duration(ANIMATION_DURATION)
                .style('width', width + 'px');
        };
    }

    function getAnimatedWidthToggler(node, offWidth, onWidth) {
        return function () {
            preventEventBubbling();
            var currentWidth = width(node), isOn = currentWidth === onWidth;
            currentWidth = isOn ? offWidth : onWidth;
            node.transition().duration(ANIMATION_DURATION)
                .style('width', currentWidth + 'px');
            return !isOn;
        };
    }

    function isControlOn(control) {
        return dcc.visualisationControl & controlOptions[control];
    }

    function addControlGroup(id, toolbar, types) {
        var i, numItems = types.length, control, toolbarWidth = 66,
            expandedWidth = numItems * toolbarWidth, suffix, toggler, button,
            group = addDiv(toolbar, null, 'control-group');

        if (isSupportedTouchDevice !== null) {
            control = types[0];
            suffix = isControlOn(control.t) ? '-on' : '-off';
            button = addDiv(group, id + '-label', 'control')
                .classed(control.t + suffix, true);
        }
        for (i = 0; i < numItems; ++i) {
            control = types[i];
            addControl(group, control.t, control.l);
        }
        if (isSupportedTouchDevice === null) {
            group.on('mouseenter',
                getAnimatedWidthChanger(group, expandedWidth));
            group.on('mouseleave',
                getAnimatedWidthChanger(group, toolbarWidth));
        } else {
            toggler = getAnimatedWidthToggler(group, toolbarWidth,
                expandedWidth + toolbarWidth);
            group.on(TOUCH_START, function () {
                if (toggler()) {
                    button.attr('class', 'control contract-button');
                } else {
                    control = types[0];
                    suffix = isControlOn(control.t) ? '-on' : '-off';
                    button.attr('class', 'control ' + control.t + suffix);
                }
            });
        }
    }

    function resizeVisualisations(dontRefresh) {
        var i, c, visualisation,
            visualisatinoHeight = getAspectHeight(visualisationWidth)
            + heightExtension;
        d3.selectAll('#infobar td > div')
            .style("width", visualisationWidth + "px");
        for (i = 0, c = visualisationCluster.length; i < c; ++i) {
            visualisation = visualisationCluster[i];
            height(visualisation, visualisatinoHeight);
            width(visualisation, visualisationWidth);
            if (visualisation.content)
                height(visualisation.content, height(visualisation)
                    - height(visualisation.title)
                    - height(visualisation.legend));
            if (!dontRefresh)
                visualisation.isRendered = false;
            if (visualisation.refit)
                visualisation.refit();
        }
        if (!dontRefresh)
            refreshVisualisationCluster(true);
    }

    function setDatapointRadius(value) {
        wildtypeDatapointRadius
            = WILDTYPE_DATAPOINT_RADIUS_SCALE[value];
        mutantDatapointRadius
            = MUTANT_DATAPOINT_RADIUS_SCALE[value];
    }

    function getZoomOnClickHandler(value) {
        return function () {
            preventEventBubbling();
            if (visualisationWidth !== value) {
                var cls, node = d3.select(this),
                    parent = d3.select(this.parentNode);
                visualisationWidth = value;
                parent.selectAll('.control')
                    .attr('class', function () {
                        return d3.select(this).attr('type') + '-off control';
                    });
                cls = node.attr('type') + '-on control';
                node.attr('class', cls);
                parent.select('#zoom-label').attr('class', cls);
                setDatapointRadius(value);
                resizeVisualisations();
            }
        };
    }

    function addZoomOption(toolbar, type, tip, value) {
        var control = addDiv(toolbar, null, 'control'),
            suffix = visualisationWidth === value ? '-on' : '-off';
        if (tip !== undefined)
            control.attr('title', tip);
        control.attr('type', type)
            .classed(type + suffix, true);
        if (isSupportedTouchDevice === null)
            control.on('click', getZoomOnClickHandler(value));
        else
            control.on(TOUCH_START, getZoomOnClickHandler(value));
        return control;
    }

    function addZoomOptions(toolbar, options) {
        var i, c = options.length, label, control, toolbarWidth = 66,
            expandedWidth = (c + 1) * toolbarWidth,
            group = addDiv(toolbar, null, 'control-group');
        label = addDiv(group, 'zoom-label', 'control');
        for (i = 0; i < c; ++i) {
            control = options[i];
            addZoomOption(group, control.t, control.l, control.v);
            if (visualisationWidth === control.v)
                label.classed(control.t + '-on', true);
        }
        if (isSupportedTouchDevice === null) {
            group.on('mouseenter',
                getAnimatedWidthChanger(group, expandedWidth));
            group.on('mouseleave',
                getAnimatedWidthChanger(group, toolbarWidth));
        } else {
            group.on(TOUCH_START, getAnimatedWidthToggler(group,
                toolbarWidth, expandedWidth));
        }
    }

    function getGenderOnClickHandler(type) {
        return function () {
            preventEventBubbling();
            var cls, node = d3.select(this), oldControl,
                combined = controlOptions.male | controlOptions.female,
                parent = d3.select(this.parentNode);
            parent.selectAll('.control')
                .attr('class', function () {
                    return d3.select(this).attr('type') + '-off control';
                });
            cls = node.attr('type') + '-on control';
            node.attr('class', cls);
            parent.select('#gender-label').attr('class', cls);

            oldControl = dcc.visualisationControl;
            switch (type) {
                case 'male':
                case 'female':
                    dcc.visualisationControl &= ~combined;
                    dcc.visualisationControl |= controlOptions[type];
                    break;
                case 'male_female':
                    dcc.visualisationControl |= combined;
            }
            refreshVisualisationCluster(true);
        };
    }

    function addGenderOption(toolbar, type, tip) {
        var control = addDiv(toolbar, null, 'control'),
            suffix = '-off', config = dcc.visualisationControl,
            combined = controlOptions.male | controlOptions.female,
            showBoth = (config & combined) === combined;
        if ((type === 'male_female' && showBoth) ||
            (!showBoth && (config & controlOptions[type]))) {
            suffix = '-on';
            toolbar.select('#gender-label')
                .attr('class', type + suffix + ' control');
        }
        if (tip !== undefined)
            control.attr('title', tip);
        control.attr('type', type)
            .classed(type + suffix, true);
        if (isSupportedTouchDevice === null)
            control.on('click', getGenderOnClickHandler(type));
        else
            control.on(TOUCH_START, getGenderOnClickHandler(type));
        return control;
    }

    function addGenderOptions(toolbar, options) {
        var i, c = options.length, label, control, toolbarWidth = 66,
            expandedWidth = (c + 1) * toolbarWidth,
            group = addDiv(toolbar, null, 'control-group');

        label = addDiv(group, 'gender-label', 'control');
        control = options[0];
        addGenderOption(group, control.t, control.l);
        label.classed(control.t + '-on', true);
        for (i = 1; i < c; ++i) {
            control = options[i];
            addGenderOption(group, control.t, control.l);
        }
        if (isSupportedTouchDevice === null) {
            group.on('mouseenter',
                getAnimatedWidthChanger(group, expandedWidth));
            group.on('mouseleave',
                getAnimatedWidthChanger(group, toolbarWidth));
        } else {
            group.on(TOUCH_START, getAnimatedWidthToggler(group,
                toolbarWidth, expandedWidth));
        }
    }

    function getZygosityOnClickHandler(type) {
        return function () {
            preventEventBubbling();
            var cls, node = d3.select(this), oldZygosity = zygosity,
                combined = controlOptions.hom |
                controlOptions.het | controlOptions.hem,
                parent = d3.select(this.parentNode);
            parent.selectAll('.control')
                .attr('class', function () {
                    return d3.select(this).attr('type') + '-off control';
                });
            cls = node.attr('type') + '-on control';
            node.attr('class', cls);
            parent.select('#zygosity-label').attr('class', cls);

            if (type === 'zygosity_all') {
                zygosity = ZYGOSITY_ALL;
                dcc.visualisationControl |= combined;
            } else {
                switch (type) {
                    case 'het':
                        zygosity = ZYGOSITY_HET;
                        break;
                    case 'hom':
                        zygosity = ZYGOSITY_HOM;
                        break;
                    case 'hem':
                        zygosity = ZYGOSITY_HEM;
                        break;
                }
                dcc.visualisationControl &= ~combined;
                dcc.visualisationControl |= controlOptions[type];
            }
            if (oldZygosity !== zygosity) {
                updateZygosityHeader();
                refreshVisualisationCluster(true);
            }
        };
    }

    var ALL_ZYGOSITY_SELECTED = controlOptions.hom |
        controlOptions.het | controlOptions.hem;

    function addZygosityOption(toolbar, type, tip) {
        var control = addDiv(toolbar, null, 'control'),
            suffix = '-off', config = dcc.visualisationControl,
            showAll = (config & ALL_ZYGOSITY_SELECTED)
            === ALL_ZYGOSITY_SELECTED;
        if ((type === 'zygosity_all' && showAll) ||
            (!showAll && (config & controlOptions[type]))) {
            suffix = '-on';
            toolbar.select('#zygosity-label')
                .attr('class', type + suffix + ' control');
        }
        if (tip !== undefined)
            control.attr('title', tip);
        control.attr('type', type)
            .classed(type + suffix, true);
        if (isSupportedTouchDevice === null)
            control.on('click', getZygosityOnClickHandler(type));
        else
            control.on(TOUCH_START, getZygosityOnClickHandler(type));
        return control;
    }

    function addZygosityOptions(toolbar, options) {
        var i, c = options.length, label, control, toolbarWidth = 66,
            expandedWidth = (c + 1) * toolbarWidth,
            group = addDiv(toolbar, null, 'control-group');

        /* if none of the zygosities were selected,
         * by default, select all zygosities */
        if ((ALL_ZYGOSITY_SELECTED & dcc.visualisationControl) === 0) {
            dcc.visualisationControl |= ALL_ZYGOSITY_SELECTED;
        }

        label = addDiv(group, 'zygosity-label', 'control');
        control = options[0];
        addZygosityOption(group, control.t, control.l);
        label.classed(control.t + '-on', true);
        for (i = 1; i < c; ++i) {
            control = options[i];
            addZygosityOption(group, control.t, control.l);
        }
        if (isSupportedTouchDevice === null) {
            group.on('mouseenter',
                getAnimatedWidthChanger(group, expandedWidth));
            group.on('mouseleave',
                getAnimatedWidthChanger(group, toolbarWidth));
        } else {
            group.on(TOUCH_START, getAnimatedWidthToggler(group,
                toolbarWidth, expandedWidth));
        }
    }

    function showVisualisationControls() {
        var parent = d3.select('#sidebar'), toolbar,
            isPreview = dcc.transientGeneParameter !== undefined;
        clear(parent);
        addDiv(parent, (isPreview ? 'back-button' : 'configure-button'))
            .attr('title', (isPreview ? 'Return to phenotype heatmap,\ngene and parameter selector'
                : 'Select genes and parameters'))
            .on('click', function () {
                preventEventBubbling();
                mode = CONFIGURE;
                showMode();
            });

        toolbar = addDiv(parent, 'controls');

        addControl(toolbar, 'overview', 'Show procedure level overviews');

        addControl(toolbar, 'infobar', 'Show statistical annotations\n and metadata details', function (isOn) {
            heightExtension = isOn ? HEIGHT_EXTENSION_VALUE : 0;
            resizeVisualisations(true);
        });
        if (dcc.visualisationControl & controlOptions['infobar'])
            heightExtension = HEIGHT_EXTENSION_VALUE;

        addGenderOptions(toolbar, [
            {
                't': 'male',
                'l': 'Include male specimens'
            },
            {
                't': 'female',
                'l': 'Include female specimens'
            },
            {
                't': 'male_female',
                'l': 'Include both male and female specimens'
            }
        ]);

        addZygosityOptions(toolbar, [
            {
                't': 'hom',
                'l': 'Include homozygous specimens'
            },
            {
                't': 'het',
                'l': 'Include heterozygous specimens'
            },
            {
                't': 'hem',
                'l': 'Include hemizygous specimens'
            },
            {
                't': 'zygosity_all',
                'l': 'Include all specimens'
            }
        ]);

        addControl(toolbar, 'polyline', 'Show polylines');
        addControl(toolbar, 'point', 'Show data points');
        addControl(toolbar, 'wildtype', 'Include wild type specimens');
        addControl(toolbar, 'swarm', 'Show Beewswarm plot');
        addControlGroup('whisker', toolbar, [
            {
                't': 'whisker',
                'l': 'Show box and whisker'
            },
            {
                't': 'whisker_iqr',
                'l': 'Extend whiskers to 1.5 IQR'
            }
        ]);
        addControlGroup('stat', toolbar, [
            {
                't': 'statistics',
                'l': 'Show descriptive statistics'
            },
            {
                't': 'quartile',
                'l': 'Show first and third quartiles'
            },
            {
                't': 'min',
                'l': 'Show minimum values'
            },
            {
                't': 'max',
                'l': 'Show maximum values'
            },
            {
                't': 'median',
                'l': 'Show median'
            },
            {
                't': 'mean',
                'l': 'Show arithmetic mean'
            }]);
        addControl(toolbar, 'crosshair', 'Show crosshair');
        addControl(toolbar, 'shapes', 'Use shapes to display datapoints\nexcept when using Beeswarm plots');
        addZoomOptions(toolbar, [
            {
                't': 'zoom_small',
                'v': ZOOM_SMALL,
                'l': 'Small sized visualisations'
            },
            {
                't': 'zoom_medium',
                'v': ZOOM_MEDIUM,
                'l': 'Medium sized visualisations'
            },
            {
                't': 'zoom_large',
                'v': ZOOM_LARGE,
                'l': 'Large sized visualisations'
            },
            {
                't': 'zoom_xlarge',
                'v': ZOOM_XLARGE,
                'l': 'Extra-large visualisations'
            }
        ]);
        return toolbar;
    }

    /**
     * Loads configuration data that is used to allow users to select
     * centres, genes, strains, procedures and parameters. The loading happens
     * in two modes:
     * 
     * 1. Selective mode: If the user supplied lists of genotype ids and
     *         parameter keys, they expect visualisation. This normally happens
     *         when the user was redirected from another source (e.g., heatmap).
     *         In these cases, we only load configuration details that are
     *         absolutely necessary, so that the application load time is fast.
     *         
     * 2. Full mode: If the user did not supply lists of genotype ids and
     *         parameter keys, they expect to start by selecting genes and
     *         parameters. Hence, we have to load all of the genes and
     *         parameters that are available for selection.
     * 
     * @param {type} parent Container node where we display progress bar.
     * @param {type} handler What to do after data has been loaded.
     * @param {type} genes If supplied, select supplied genes.
     * @param {type} params If supplied, select supplied parameters.
     */
    function loadConfigData(parent, handler, genes, params) {
        loadingApp(parent);
        progress(10, 'Loading centres...');
        d3.json("rest/centres", function (data) {
            progress(20, 'Processing centres...');
            processCentres(data);
            progress(30, 'Loading centre activity...');
            d3.json("rest/centres/activity", function (data) {
                processCentreActivity(data);
                progress(40, 'Loading genes and strains...');
                d3.json("rest/genestrains" +
                    (genes ? '?g=' + genes : ''),
                    function (data) {
                        progress(50, 'Processing genes and strains...');
                        processGenes(data);
                        progress(60, 'Loading procedures...');
                        d3.json("rest/procedure", function (data) {
                            progress(70, 'Processing procedures...');
                            processProcedures(data);
                            progress(80, 'Loading parameters...');
                            d3.json("rest/parameter" +
                                (params ? '?q=' + params : ''),
                                function (data) {
                                    progress(90, 'Processing parameters...');
                                    processParameters(data);
                                    progress(100, 'All done...');

                                    if (genes === undefined && params === undefined)
                                        fullConfigHasBeenLoaded = true;

                                    /* only set the expiration countdown when
                                     * configuration data was loaded */
                                    if (genes === undefined &&
                                        params === undefined)
                                        dateConfigDataExpires =
                                            addMillisecondstoDate(new Date(),
                                                MILLISECONDS_TO_EXPIRATION);
                                    clear(parent);
                                    handler();
                                });
                        });
                    });
            });
        });
    }

    function showConfigurationInterface() {
        if (informationBox)
            informationBox.classed('hidden', true);
        var content = d3.select('#content'),
            navigator = addDiv(content, 'navigator'),
            mainContent = addDiv(content, 'main-content');
        detailsPanel = new DetailsPanel(content);
        showNavigationBar(navigator, mainContent);
        switch (stateToReturnTo) {
            case 'centre':
                showCentres(mainContent);
                break;
            case 'gene':
                showGenes(mainContent);
                break;
            case 'procedure':
                showProcedures(mainContent);
                break;
            case 'parameter':
                showParameters(mainContent);
                break;
            case 'heatmap':
            default:
                showHeatmap(mainContent);
        }
        resize();
    }

    function showConfigure() {
        var sidebar = d3.select('#sidebar');
        sidebar.savedWidth = sidebar.style('width');
        sidebar.style('display', 'none').style('width', '0px');

        /* load configuration data if it has not already been loaded, or
         * reload data if it has expired. We cache configuration data during
         * a session as it does not change very often, however, it should not
         * be cached forever, in case they do change between a session. */
        if (fullConfigHasBeenLoaded === false ||
            dateConfigDataExpires === null ||
            dateConfigDataExpires < new Date()) {
            loadConfigData(d3.select('#content'), showConfigurationInterface);
        } else
            showConfigurationInterface();
    }

    function showNavigationBar(parent, configContent) {
        var i, j, c, d, datum, section, node, ul,
            getClickHandler = function (fn) {
                return function () {
                    preventEventBubbling();
                    clear(d3.select('#details-panel'));
                    filterBy.text = null;
                    fn(configContent);
                };
            };
        for (i = 0, c = navigatorItems.length; i < c; ++i) {
            datum = navigatorItems[i];
            section = addDiv(parent, null, 'nav-section');
            addDiv(section, datum.id ? datum.id : null, null, datum.title);
            ul = section.append('ul').text(datum.label);
            datum = datum.items;
            for (j = 0, d = datum.length; j < d; ++j) {
                node = datum[j];
                ul.append('li').attr('id', node.id + '-browse')
                    .text(node.label)
                    .attr('title', node.hint)
                    .on('click', getClickHandler(node.fn, configContent));
            }
        }
        d3.select('#genes-basket-browse')
            .append('span').attr('id', 'genes-count')
            .attr('title', 'Number of genes that have been\nselected for comparison')
            .text(geneList.count());
        d3.select('#parameters-basket-browse')
            .append('span').attr('id', 'parameters-count')
            .attr('title', 'Number of parameters that have been\nselected for comparison')
            .text(parameterList.count());

        addDiv(parent, 'visualise-button', null, 'Visualise')
            .attr('title', 'Comparatively visualise the current\nselection of genes and parameters')
            .on('click', function () {
                preventEventBubbling();
                /* enter mode that uses gene/parameter selection. */
                dcc.transientGeneParameter = undefined;

                if (geneList.count() === 0) {
                    alert('The gene list is empty. Please select at least one gene.');
                } else if (parameterList.count() === 0) {
                    alert('The parameter list is empty. Please select at least one parameter.');
                } else {
                    dcc.visualiseSelection();
                }
            });

        addDiv(parent, 'clear-cookies', null, 'Clean restart')
            .attr('title', 'Clean restart Phenoview by clearing\ncurrent selections and browser cookies')
            .on('click', function () {
                preventEventBubbling();
                emptyGeneSelection();
                emptyParameterSelection();
                resetState();
                mode = CONFIGURE;
                showMode();
            });
    }

    function getCentreMouseEnterHandler(cid) {
        return function () {
            detailsPanel.update(cid);
        };
    }

    function setReturnState(state) {
        d3.select('#' + state + '-browse').classed('navigator-selected', true);
        stateToReturnTo = state;
        setCookie('state', stateToReturnTo);
    }

    function showHeatmap(parent) {
        /* use by Phenoview heatmap for doing centre filtering */
        dcc.centresMap = centresMap;

        setReturnState('heatmap');
        detailsPanel.hide();
        clear(parent);
        parent = addDiv(parent, 'heatmap');
        heatmap = new dcc.PhenoHeatMap({
            /* identifier of <div> node that will host the heatmap */
            'container': 'heatmap',
            /* default usage mode: ontological or procedural */
            'mode': 'procedural',
            'url': {
                /* the base URL of the heatmap javascript source */
                'jssrc': '/heatmap/js/',
                /* the base URL of the heatmap data source */
                'json': '/heatmap/rest/'
            }
        });
        refitConfigure();
    }

    function switchConfigurationMode(parent, mode) {
        clear(parent);
        parent = addDiv(parent, 'list-container');
        detailsPanel.changeMode(mode);
        return parent;
    }

    function showCentres(parent) {
        var centre, i, c, node;
        setReturnState('centre');
        heatmap = null;

        /* if we returned from a preview, return to the centre gene list */
        if (centreShowingDetails === null
            || centresMap[centreShowingDetails] === undefined) {
            parent = switchConfigurationMode(parent, CENTRE_DETAILS);
            for (i = 0, c = centres.length; i < c; ++i) {
                centre = centres[i];
                node = addDiv(parent, null, 'centre-' + centre.s);
                addDiv(node);
                addDiv(node, null, null, centre.f);
                node.on('click', getCentreClickHandler(centre))
                    .on('mouseenter', getCentreMouseEnterHandler(centre.i));
            }
        } else {
            parent = switchConfigurationMode(parent,
                PROCEDURES_AND_PARAMS_WITH_DATA);
            getCentreSelectHandler(centresMap[centreShowingDetails])();
        }
        refitConfigure();
    }

    function showListUIFrameWork(parent) {
        clear(parent);
        var header = addDiv(parent, 'list-header'),
            footer = addDiv(parent, 'list-footer', 'unselectable'),
            content = addDiv(parent, 'list-content')
            ;
        height(content, height(parent) - height(header) - height(footer) - 1);
        return {
            'header': header,
            'content': content,
            'footer': footer
        };
    }

    function getCentreClickHandler(centre) {
        return function () {
            preventEventBubbling();
            centreShowingDetails = centre.i;
            setCookie('centre', centreShowingDetails);
            var parent = d3.select('#list-container');
            hideAndRemoveNodes(parent, getCentreSelectHandler(centre));
        };
    }

    function getCentreSelectHandler(centre) {
        return function () {
            detailsPanel.changeMode(PROCEDURES_AND_PARAMS_WITH_DATA);
            filterBy.centre = centre.i;
            sortedBy.genes = SORT_BY_GENE_ALLELE;
            sortGenes();
            showCentreGenes(centre);
        };
    }

    function showCentreGenes(centre) {
        isSimpleList = true;
        var list = showListUIFrameWork(d3.select('#list-container')),
            count, header = list.header;
        count = showListPager(list.footer, genes, getGeneListFilter(),
            showGeneList);
        showCentreGeneHeader(header, centre, count);
        showGeneListControls(header);
        showGeneList(list.content);
    }

    function showCentreGeneHeader(parent, centre, count) {
        parent.append('img').attr('class', 'small-logo')
            .attr('src', 'images/logo_' + centre.s + '.png');
        addDiv(parent, null, 'large-name', centre.f);
        addDiv(parent, null, 'num-genes', count + ' lines');
    }

    function hideAndRemoveNodes(parent, fn) {
        var nodes = parent.select('div');
        nodes.remove();
        fn();
    }

    function showGenes(parent) {
        setReturnState('gene');
        heatmap = null;

        parent = switchConfigurationMode(parent, PROCEDURES_AND_PARAMS_WITH_DATA);

        isSimpleList = false;
        filterBy.centre = null;
        var list = showListUIFrameWork(parent), header = list.header;
        showListPager(list.footer, genes, getGeneListFilter(), showGeneList);
        showGeneListHeader(header);
        showGeneListControls(header);
        showGeneList(list.content);
        refitConfigure();
    }

    function showGeneListHeader(parent) {
        var s, sb = new SearchBox(parent, 'gene', function (value) {
            if (value !== undefined) {
                if (value === '') {
                    /* we want to select the first row since we cleared the search box */
                    geneShowingDetails = null;
                    procedureShowingDetails = null;
                }
                setCookie('gene_searched', value),
                    filterBy.text = value.toLowerCase();
                listCurrentPage = 0;
                showListPager(d3.select('#list-footer'), genes,
                    getGeneListFilter(), showGeneList);
                showGeneList(d3.select('#list-content'));
            }
        }, 'search for available genes by allele, strain or genotype');
        s = getCookie('gene_searched');
        if (s !== undefined)
            sb.set(s);
    }

    function addMgiIdColumn(tr, datum) {
        tr.append('td').attr('class', 'mgiid-col')
            .append('a').attr('class', 'mgiid')
            .attr('href', '../data/genes/' + datum.geneId)
            .attr('target', '_blank')
            .text(datum.geneId);
    }

    function addFieldFragment(parent, cls) {
        var f = document.createElement('div');
        f.className = cls;
        parent.appendChild(f);
        return f;
    }

    function addFieldFragmentContent(parent, cls, value) {
        var f = document.createElement('div');
        f.className = cls;
        f.innerHTML = value;
        parent.appendChild(f);
        return f;
    }

    function addMgiIdFragment(parent, geneId) {
        var f = document.createElement('td'), n;
        f.className = 'mgiid-col';
        parent.appendChild(f);
        n = document.createElement('a');
        n.className = 'mgiid';
        n.target = '_blank';
        n.href = '../data/genes/' + geneId;
        n.innerHTML = geneId;
        f.appendChild(n);
        return n;
    }

    function addDetailedGeneFields(tr, datum) {
        var fragment = document.createDocumentFragment(), values, temp;

        values = document.createElement('td');
        fragment.appendChild(values);

        temp = document.createElement('img');
        temp.className = 'small-logo';
        temp.src = 'images/logo_' + centresMap[datum.cid].s + '.png';
        values.appendChild(temp);

        temp = addFieldFragment(values, 'left-field');
        addFieldFragmentContent(temp, 'allele',
            datum.alleleName ? datum.alleleName : datum.geneSymbol);
        addFieldFragmentContent(temp, 'strain', datum.strain);

        temp = addFieldFragment(values, 'right-field');
        addFieldFragmentContent(temp, 'ilar', centresMap[datum.cid].f);
        addFieldFragmentContent(temp, 'genotype', datum.genotype);
        addMgiIdFragment(fragment, datum.geneId);

        tr.on('click', function () {
            d3.selectAll('.selected-row').classed('selected-row', false);
            tr.classed('selected-row', true);
            geneShowingDetails = dcc.getGeneStrainCentreId(datum);
            setCookie('gene', geneShowingDetails);
            detailsPanel.update(datum);
        });
        tr.node().appendChild(fragment);
    }

    function addSimpleGeneFields(tr, datum) {
        var values = tr.append('td'), temp;
        temp = addDiv(values, null, 'left-field');
        addField(temp, datum.alleleName ? datum.alleleName
            : datum.geneSymbol, 'allele');

        temp = addDiv(values, null, 'right-field');
        addField(temp, datum.strain, 'strain');
        addField(temp, datum.genotype, 'genotype');

        addMgiIdColumn(tr, datum);
        tr.on('click', function () {
            d3.selectAll('.selected-row').classed('selected-row', false);
            tr.classed('selected-row', true);
            geneShowingDetails = dcc.getGeneStrainCentreId(datum);
            setCookie('gene', geneShowingDetails);
            detailsPanel.update(datum);
        });
    }

    function getGeneListFilter() {
        var geneFilter = null, filterField = filterBy.centre;
        if (filterBy.centre) {
            geneFilter = function (datum) {
                return filterField !== datum.cid;
            };
        } else {
            geneFilter = function (datum) {
                var matches = true;
                if (datum && filterBy.text)
                    matches = datum.filter.indexOf(filterBy.text) !== -1;
                return !matches;
            };
        }
        return geneFilter;
    }

    function showGeneList(parent) {
        clear(parent);
        d3.selectAll('.list-goto-page').classed('list-current-page', false);
        d3.select('#list-goto-page-' + listCurrentPage)
            .classed('list-current-page', true);
        return showList(parent, genes, 'gene', getGeneListFilter(),
            isSimpleList ? addSimpleGeneFields : addDetailedGeneFields);
    }

    function emptyGeneSelection() {
        selectedGenesMap = {};
        geneList.empty();
        selectedGenesCount = 0;
        d3.select('#genes-count').text(selectedGenesCount);
        saveSelectionAsCookies();
    }

    function emptyParameterSelection() {
        selectedParametersMap = {};
        parameterList.empty();
        selectedParametersCount = 0;
        d3.select('#parameters-count').text(selectedParametersCount);
        saveSelectionAsCookies();
    }

    function addGeneToSelection(geneId) {
        selectedGenesMap[geneId] = geneId;
        geneList.append(availableGenesMap[geneId]);
        d3.select('#genes-count').text(++selectedGenesCount);
        saveSelectionAsCookies();
    }

    function addParameterToSelection(qeid) {
        selectedParametersMap[qeid] = qeid;
        parameterList.append(availableParametersMap[qeid]);
        d3.select('#parameters-count').text(++selectedParametersCount);
        saveSelectionAsCookies();
    }

    function removeGeneFromSelection(geneId) {
        delete selectedGenesMap[geneId];
        geneList.remove(geneId);
        d3.select('#genes-count').text(--selectedGenesCount);
        saveSelectionAsCookies();
        return geneList.count();

    }

    function removeParameterFromSelection(qeid) {
        delete selectedParametersMap[qeid];
        parameterList.remove(qeid);
        d3.select('#parameters-count').text(--selectedParametersCount);
        saveSelectionAsCookies();
        return parameterList.count();
    }

    function addGeneToBasket(node, geneId) {
        node.attr('class', 'basket-on');
        addGeneToSelection(geneId);
        node.on('click', function () {
            preventEventBubbling();
            removeGeneFromBasket(node, geneId);
        });
    }

    function addParameterToBasket(node, qeid) {
        node.attr('class', 'basket-on');
        addParameterToSelection(qeid);
        node.on('click', function () {
            preventEventBubbling();
            removeParameterFromBasket(node, qeid);
        });
    }

    function removeGeneFromBasket(node, geneId) {
        node.attr('class', 'basket-off');
        removeGeneFromSelection(geneId);
        node.on('click', function () {
            preventEventBubbling();
            addGeneToBasket(node, geneId);
        });
    }

    function removeParameterFromBasket(node, qeid) {
        node.attr('class', 'basket-off');
        removeParameterFromSelection(qeid);
        node.on('click', function () {
            preventEventBubbling();
            addParameterToBasket(node, qeid);
        });
    }

    dcc.getGeneBasket = function (datum) {
        var geneId = dcc.getGeneStrainCentreId(datum);
        return selectedGenesMap[geneId] === undefined ?
            {
                'cls': 'basket-off',
                'onclick': function () {
                    addGeneToBasket(d3.select(this), geneId);
                }
            } :
            {
                'cls': 'basket-on',
                'onclick': function () {
                    removeGeneFromBasket(d3.select(this), geneId);
                }
            };
    };

    dcc.getParameterBasket = function (datum) {
        var qeid = datum.e;
        return selectedParametersMap[qeid] === undefined ?
            {
                'cls': 'basket-off',
                'onclick': function () {
                    addParameterToBasket(d3.select(this), qeid);
                }
            } :
            {
                'cls': 'basket-on',
                'onclick': function () {
                    removeParameterFromBasket(d3.select(this), qeid);
                }
            };
    };

    dcc.getVisualisationBasket = function (geneId, qeid) {
        if (selectedGenesMap[geneId] === undefined
            || selectedParametersMap[qeid] === undefined) {
            return {
                'cls': 'basket-off',
                'title': 'Click to add gene and parameter\ncombination to comparative visualisation',
                'onclick': function () {
                    if (selectedGenesMap[geneId] === undefined)
                        addGeneToBasket(d3.select(this), geneId);
                    if (selectedParametersMap[qeid] === undefined)
                        addParameterToBasket(d3.select(this), qeid);
                }
            };
        } else {
            return {
                'cls': 'basket-on',
                'title': 'Click to remove gene from comparative visualisation',
                'onclick': function () {
                    if (selectedGenesMap[geneId] !== undefined)
                        removeGeneFromBasket(d3.select(this), geneId);
                }
            };
        }
    };

    function showParameters(parent) {
        setReturnState('parameter');
        heatmap = null;

        parent = switchConfigurationMode(parent, PROCEDURE_DETAILS);

        isSimpleList = false;
        filterBy.procedure = null;
        var list = showListUIFrameWork(parent), header = list.header;
        showListPager(list.footer, parameters, getParameterListFilter(), showParameterList);
        showParameterListHeader(header);
        showParameterListControls(header);
        showParameterList(list.content);
        refitConfigure();
    }

    function showParameterListHeader(parent) {
        var s, sb = new SearchBox(parent, 'parameter', function (value) {
            if (value !== undefined) {
                setCookie('param_searched', value);
                filterBy.text = value.toLowerCase();
                listCurrentPage = 0;
                showListPager(d3.select('#list-footer'), parameters, getParameterListFilter(), showParameterList);
                showParameterList(d3.select('#list-content'));
            }
        }, 'search for available parameters by parameter key or name');
        s = getCookie('param_searched');
        if (s !== undefined)
            sb.set(s);
    }

    function getOnProcedureMouseEnterHandler(procedureId) {
        return function () {
            detailsPanel.update(procedureId);
        };
    }

    function addDetailedParameterFields(tr, datum) {
        if (procedureKeyToProcedureDetailsMap[datum.p[0]] === undefined)
            return;
        var fragment = document.createDocumentFragment(), values, temp,
            matched = datum.e.match(REGEX_PROC_KEY)[1];

        values = document.createElement('td');
        values.className = 'icon-col';
        fragment.appendChild(values);
        temp = addFieldFragmentContent(values, 'small-param-icon', matched);
        temp.style.backgroundColor = procedureColour[matched];

        values = document.createElement('td');
        values.className = 'content-col';
        fragment.appendChild(values);
        temp = addFieldFragment(values, 'left-field');
        addFieldFragmentContent(temp, 'param-key', datum.e);
        addFieldFragmentContent(temp, 'param-name', datum.n);
        temp = addFieldFragment(values, 'right-field');
        addFieldFragmentContent(temp, 'procedure-name',
            procedureKeyToProcedureDetailsMap[datum.p[0]].n);

        tr.on('click', getOnProcedureMouseEnterHandler(datum.p));
        tr.node().appendChild(fragment);
    }

    function addSimpleParameterFields(tr, datum) {
        var values = tr.append('td'), temp;
        temp = addDiv(values, null, 'left-field');
        addField(temp, datum.e, 'param-key');
        addField(temp, datum.n, 'param-name');
    }

    function getParameterListFilter() {
        var parameterFilter = null, procedureId = filterBy.procedure;
        if (procedureId === null) {
            parameterFilter = function (datum) {
                var matches = true;
                if (datum && filterBy.text)
                    matches = datum.filter.indexOf(filterBy.text) !== -1;
                return !matches;
            };
        } else {
            parameterFilter = function (datum) {
                var p = datum.p, i, c = p.length;
                for (i = 0; i < c; ++i)
                    if (procedureId === p[i])
                        return false;
                return true;
            };
        }
        return parameterFilter;
    }

    function showParameterList(parent) {
        clear(parent);
        d3.selectAll('.list-goto-page')
            .classed('list-current-page', false);
        d3.select('#list-goto-page-' + listCurrentPage)
            .classed('list-current-page', true);
        return showList(parent, parameters, 'param', getParameterListFilter(),
            isSimpleList ?
            addSimpleParameterFields : addDetailedParameterFields);
    }

    function showList(parent, list, type, filterOut, fieldGenerator) {
        var datum, i, c, numFound = 0, numRows = 0, tr, actions, firstRow,
            defaultRowToSelect, table = parent.append('table'),
            basket, start, end, handler = type === 'gene' ?
            dcc.getGeneBasket : dcc.getParameterBasket,
            rowCls = ['even-row', 'odd-row'];
        table.append('tr').append('td');
        start = LIST_PAGE_SIZE * listCurrentPage;
        end = start + LIST_PAGE_SIZE;
        for (i = 0, c = list.length; i < c; ++i) {
            datum = list[i];
            if (filterOut(datum))
                continue;

            if (++numFound <= start)
                continue;

            tr = table.append('tr').attr('class', rowCls[++numRows % 2]);
            fieldGenerator(tr, datum);
            actions = tr.append('td').attr('class', 'actions-col');
            basket = handler(datum);
            addDiv(actions, null, basket.cls).on('click', basket.onclick);
            if (numRows === 1)
                firstRow = tr;

            if (geneShowingDetails !== null) {
                if (geneShowingDetails === dcc.getGeneStrainCentreId(datum))
                    defaultRowToSelect = tr;
            }

            if (numFound === end)
                break;
        }

        if (defaultRowToSelect === undefined)
            defaultRowToSelect = firstRow;
        if (defaultRowToSelect) {
            c = defaultRowToSelect.on('click');
            if (c)
                c();
        }
    }

    function showGeneListControls(parent) {
        var sorted;
        sorted = addDiv(parent, 'sorter');
        addDiv(sorted, null, null, 'Sort by: ');
        addDiv(sorted, null, null, 'Gene')
            .on('click', getGeneSortHandler(SORT_BY_GENE_ALLELE));
        addDiv(sorted, null, null, 'Strain')
            .on('click', getGeneSortHandler(SORT_BY_GENE_STRAIN));
        if (!isSimpleList)
            addDiv(sorted, null, null, 'Centre')
                .on('click', getGeneSortHandler(SORT_BY_GENE_CENTRE));
    }

    function countActiveRows(list, filterOut) {
        var i, c, k = 0;
        for (i = 0, c = list.length; i < c; ++i) {
            if (filterOut(list[i]))
                continue;
            k++;
        }
        return k;
    }

    function hideInactiveListPagerButtons() {
        var cls = 'disabled-pager-button',
            temp = listCurrentPage === listLastPage;
        d3.select('#list-last-page').classed(cls, temp);
        d3.select('#list-next-page').classed(cls, temp);

        temp = listCurrentPage === 0;
        d3.select('#list-first-page').classed(cls, temp);
        d3.select('#list-previous-page').classed(cls, temp);
    }

    function getListPageSelectHandler(parent, page, fn) {
        return function () {
            if (listCurrentPage === page)
                return;
            listCurrentPage = page;
            fn(parent);
        };
    }

    function showListPager(footer, list, filter, displayHandler) {
        clear(footer);
        if (list === undefined || displayHandler === undefined) {
            footer.style('display', 'none');
            return 0;
        }
        if (filter === undefined) {
            filter = function () {
                return true;
            };
        }
        var numActiveRows = countActiveRows(list, filter);
        if (numActiveRows < LIST_PAGE_SIZE) {
            footer.style('display', 'none');
            return numActiveRows;
        } else
            footer.style('display', 'block');

        var i, c, t, p = d3.select('#list-content');
        listLastPage = Math.ceil(numActiveRows / LIST_PAGE_SIZE) - 1;
        t = addDiv(footer, 'list-goto-page-container');
        for (i = 0, c = listLastPage; i <= c; ++i)
            addDiv(t, 'list-goto-page-' + i, 'list-goto-page', i + 1)
                .on('click', getListPageSelectHandler(p, i, displayHandler));

        addDiv(footer, 'list-last-page', null, 'last')
            .on('click', function () {
                if (listCurrentPage === listLastPage)
                    return;
                listCurrentPage = listLastPage;
                hideInactiveListPagerButtons();
                displayHandler(p);
            });
        addDiv(footer, 'list-next-page', null, 'next')
            .on('click', function () {
                if (listCurrentPage === listLastPage)
                    return;
                ++listCurrentPage;
                hideInactiveListPagerButtons();
                displayHandler(p);
            });
        addDiv(footer, 'list-previous-page', null, 'previous')
            .on('click', function () {
                if (listCurrentPage === 0)
                    return;
                --listCurrentPage;
                hideInactiveListPagerButtons();
                displayHandler(p);
            });
        addDiv(footer, 'list-first-page', null, 'first')
            .on('click', function () {
                if (listCurrentPage === 0)
                    return;
                listCurrentPage = 0;
                hideInactiveListPagerButtons();
                displayHandler(p);
            });
        hideInactiveListPagerButtons();
        return numActiveRows;
    }

    function getGeneSortHandler(field) {
        return function () {
            preventEventBubbling();
            sortedBy.genes = field;
            sortGenes();
            showGeneList(d3.select('#list-content'));
            d3.select(this.parentNode).selectAll('.active')
                .classed('active', false);
            d3.select(this).classed('active', true);
        };
    }

    function getProcedureClickHandler(procedure) {
        return function () {
            preventEventBubbling();
            hideAndRemoveNodes(d3.select('#list-container'),
                getProcedureSelectHandler(procedure));
        };
    }

    function getProcedureSelectHandler(procedure) {
        return function () {
            preventEventBubbling();
            filterBy.procedure = procedure.i;
            showProcedureParameters(procedure);
        };
    }

    function showProcedureParameters(procedure) {
        isSimpleList = true;
        var list = showListUIFrameWork(d3.select('#list-container')),
            count, header = list.header;
        count = showListPager(list.footer, parameters,
            getParameterListFilter(), showParameterList);
        showProcedureParameterHeader(header, procedure, count);
        showParameterListControls(header);
        showParameterList(list.content);
    }

    function showProcedureParameterHeader(parent, procedure, count) {
        var link = '/impress/protocol/' + procedure.id;
        parent.append('a')
            .attr('href', link)
            .append('div')
            .attr('class', 'small-param-icon')
            .style('background-color', procedureColour[procedure.c])
            .text(procedure.c);
        parent.append('a').attr('href', link)
            .attr('class', 'large-name').text(procedure.n +
            ', Version ' + procedure.M + '.' + procedure.m);
        addDiv(parent, null, 'num-genes', count + ' parameters');
    }

    function showProcedures(parent) {
        var procedure, i, c, node, temp;

        setReturnState('procedure');
        heatmap = null;

        parent = switchConfigurationMode(parent, PROCEDURE_DETAILS);

        sortProcedures();
        for (i = 0, c = procedures.length; i < c; ++i) {
            procedure = procedures[i];
            node = addDiv(parent, null, 'procedure');
            temp = addDiv(node, null, 'procedure-icon');
            temp.style('background-color', procedureColour[procedure.c]);
            temp.append('div')
                .attr('class', 'procedure-icon-label')
                .text(procedure.c);

            addDiv(node, null, null, procedure.n);
            addDiv(node, null, 'procedure-key', procedure.k);
            addDiv(node, null, null, procedure.M + '.' + procedure.m);
            node.on('click', getProcedureClickHandler(procedure));
            node.on('mouseenter', getOnProcedureMouseEnterHandler(procedure.i));
        }
        refitConfigure();
    }

    function showParameterListControls(parent) {
        var sorted;
        sorted = addDiv(parent, 'sorter');
        addDiv(sorted, null, null, 'Sort by: ');
        addDiv(sorted, null, null, 'Key')
            .on('click', getParameterSortHandler(SORT_BY_PARAMETER_KEY));
        addDiv(sorted, null, null, 'Name')
            .on('click', getParameterSortHandler(SORT_BY_PARAMETER_NAME));
        if (!isSimpleList)
            addDiv(sorted, null, null, 'Procedure')
                .on('click', getParameterSortHandler(SORT_BY_PROCEDURE_NAME));
    }

    function getParameterSortHandler(field) {
        return function () {
            preventEventBubbling();
            sortedBy.parameters = field;
            sortParameters();
            showParameterList(d3.select('#list-content'));
            d3.select(this.parentNode).selectAll('.active')
                .classed('active', false);
            d3.select(this).classed('active', true);
        };
    }

    /**
     * Adds a parameter field to the list item display.
     * 
     * @param {Object} node Row DOM node that represents an item.
     * @param {String} text Item value.
     * @param {String} cls Class to use for display.
     */
    function addField(node, text, cls) {
        addDiv(node, null, cls)
            .node().innerHTML = text;
    }

    /**
     * Add fields for items in parameter list.
     * 
     * @param {Object} tr DOM node that represents a parameter item.
     * @param {Object} datum Parameter data.
     */
    function addParameterFields(tr, datum) {
        var values = tr.append('td'), temp;
        values.append('img').attr('class', 'small-logo')
            .attr('src', 'images/logo_' +
                datum.e.match(REGEX_PROC_KEY)[1] + '.png');
        temp = addDiv(values, null, 'left-field');
        addField(temp, datum.n, 'param-name');
        addField(temp, datum.e, 'param-key');
        temp = addDiv(values, null, 'right-field');
        addField(temp, datum.a, 'procedure-name');
    }

    /**
     * Implements a doubly-linked list. This is used for maintaining the current
     * gene and parameter selections. We use doubly-linked list because it
     * makes ordering of list items by dragging must easier to implement.
     * 
     * @param {String} keyName Item property name to use a node key.
     */
    var DoubleLinkedList = function (keyName) {
        this.head = null;
        this.tail = null;
        this.numNodes = 0;
        this.keyName = keyName;
    };

    DoubleLinkedList.prototype = {
        count: function () {
            return this.numNodes;
        },
        makeNode: function (data) {
            var me = this, node = {}, count, type;
            node.data = data;
            node.key = data[me.keyName];
            node.next = null;
            node.prev = null;

            /* if this is a parameter selection list, account for
             * selected parameters for a given procedure type */
            if (this.keyName === PARAMETER_KEY_FIELD) {
                type = data.pt;
                if (dcc.selectedParametersCountForType === undefined) {
                    dcc.selectedParametersCountForType = {};
                    dcc.selectedParametersCountForType[type] = 1;
                } else {
                    count = dcc.selectedParametersCountForType[type];
                    if (count === undefined)
                        count = 1;
                    else
                        count++;
                    dcc.selectedParametersCountForType[type] = count;
                }
            }

            return node;
        },
        first: function (node) {
            var me = this;
            me.head = node;
            me.tail = node;
        },
        append: function (node) {
            var me = this;
            node = me.makeNode(node);
            ++me.numNodes;
            if (me.tail === null)
                me.first(node);
            else {
                node.next = null;
                node.prev = me.tail;
                me.tail.next = node;
                me.tail = node;
            }
        },
        add: function (node) {
            var me = this;
            node = me.makeNode(node);
            ++me.numNodes;
            if (me.head === null)
                me.first(node);
            else {
                node.prev = null;
                node.next = me.head;
                me.head.prev = node;
                me.head = node;
            }
        },
        insertAfter: function (node, index) {
            var me = this, cursor = me.nodeAt(index);
            node = me.makeNode(node);
            ++me.numNodes;
            if (cursor === null)
                me.append(node);
            else {
                node.prev = cursor;
                node.next = cursor.next;
                cursor.next.prev = node;
                cursor.next = node;
            }
        },
        del: function (node) {
            var me = this, count, type;
            /* if this is a parameter selection list, account for
             * selected parameters for a given procedure type */
            if (this.keyName === PARAMETER_KEY_FIELD) {
                type = node.data.pt;
                count = dcc.selectedParametersCountForType[type];
                count--;
                if (count < 0)
                    count = 0;
                dcc.selectedParametersCountForType[type] = count;
            }

            --me.numNodes;
            if (node.prev === null)
                me.head = node.next;
            else
                node.prev.next = node.next;

            if (node.next === null)
                me.tail = node.prev;
            else
                node.next.prev = node.prev;
            delete node;
        },
        empty: function () {
            var me = this, temp = me.head, next, count, type;
            while (temp) {
                /* if this is a parameter selection list, account for
                 * selected parameters for a given procedure type */
                if (this.keyName === PARAMETER_KEY_FIELD) {
                    type = temp.data.pt;
                    count = dcc.selectedParametersCountForType[type];
                    count--;
                    if (count < 0)
                        count = 0;
                    dcc.selectedParametersCountForType[type] = count;
                }
                next = temp.next;
                delete temp;
                temp = next;
            }
            me.numNodes = 0;
            me.head = me.tail = null;
        },
        nodeAt: function (index) {
            var me = this, cursor = me.head, count = 0;
            while (cursor !== null && count++ < index)
                cursor = cursor.next;
            return cursor;
        },
        find: function (key) {
            var me = this, cursor = me.head;
            while (cursor !== null) {
                if (cursor.key === key)
                    break;
                cursor = cursor.next;
            }
            return cursor;
        },
        remove: function (key) {
            var me = this, node = me.find(key);
            if (node !== null)
                me.del(node);
            return me.count();
        },
        moveTo: function (key, index) {
            var me = this, node = me.find(key), successor = me.nodeAt(index);
            if (node !== null) {
                if (successor !== node) {
                    /* detach node to be moved */
                    if (node.prev === null) {
                        me.head = node.next;
                        if (me.head !== null)
                            me.head.prev = null;
                    } else {
                        node.prev.next = node.next;
                    }
                    if (node.next === null) {
                        me.tail = node.prev;
                        if (me.tail !== null)
                            me.tail.next = null;
                    } else {
                        node.next.prev = node.prev;
                    }

                    /* make the insertion at new location */
                    if (successor === null) {
                        node.next = null;
                        node.prev = me.tail;
                        if (me.tail === null)
                            me.head = node;
                        else
                            me.tail.next = node;
                        me.tail = node;
                    } else {
                        node.prev = successor.prev;
                        node.next = successor;
                        if (successor.prev === null)
                            me.head = node;
                        else
                            successor.prev.next = node;
                        successor.prev = node;
                    }
                }
            }
        },
        print: function () {
            var me = this, cursor = me.head;
            while (cursor !== null) {
                console.log(cursor);
                cursor = cursor.next;
            }
        },
        traverse: function (doSomething) {
            var me = this, cursor = me.head;
            while (cursor !== null) {
                doSomething(cursor.data, cursor.key);
                cursor = cursor.next;
            }
        }
    };

    /**
     * Adds a gene to the list of selected genes.
     * 
     * @param {Object} gene Gene to be selected.
     */
    function addGeneToSelectionList(gene) {
        var gid = gene.gid, sid = gene.sid, cid = gene.cid,
            geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid), datum;
        if (selectedGenesMap[geneId] === undefined) {
            datum = availableGenesMap[geneId];
            if (datum === undefined)
                console.warn("Gene with centre id " + cid +
                    ", genotype id " + gid +
                    " and strain id " + sid +
                    " is currently unavailable");
            else
                addGeneToSelection(geneId, datum);
        } else
            console.warn("Gene with centre id " + cid +
                ", genotype id " + gid +
                " and strain id " + sid +
                " has already been specified. Will ignore.");
    }

    /**
     * Adds all genes with matching genotype id.
     * 
     * @param {Integer} gid Genotype identifier.
     */
    function selectMatchingGenotype(gid) {
        var gene, i, c;
        for (i = 0, c = genes.length; i < c; ++i) {
            gene = genes[i];
            if (gene.gid === gid)
                addGeneToSelectionList(gene);
        }
    }

    /**
     * Adds all genes with matching genotype id and strain id.
     * 
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     */
    function selectMatchingGenotypeStrain(gid, sid) {
        var gene, i, c;
        for (i = 0, c = genes.length; i < c; ++i) {
            gene = genes[i];
            if (gene.gid === gid && gene.sid === sid)
                addGeneToSelectionList(gene);
        }
    }

    /**
     * Adds all genes with matching genotype id, strain id and centre id.
     * 
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     */
    function selectMatchingGenotypeStrainCentre(gid, sid, cid) {
        var gene, i, c;
        for (i = 0, c = genes.length; i < c; ++i) {
            gene = genes[i];
            if (gene.gid === gid && gene.sid === sid && gene.cid === cid)
                addGeneToSelectionList(gene);
        }
    }

    /**
     * Process gene selection as specified in the URL.
     * a gene is uniquely identified by its centre (cid), gene (gid)
     * and strain (sid) identifiers. By convention, these are
     * separated by a '-'.
     * 
     * @param {String} gene Gene specification.
     * @returns {unresolved}
     */
    function processGeneSelection(gene) {
        var geneStrain = gene.split('-'), gid, sid, cid;
        if (geneStrain === null || geneStrain.length < 1) {
            alert("Invalid gene specification in URL: '" + gene +
                ".\nUse format <genotype id>-<strain id>-<centre id>");
            return;
        }
        gid = parseInt(geneStrain[0], 10);
        sid = parseInt(geneStrain[1], 10);
        cid = parseInt(geneStrain[2], 10);

        if (isNaN(gid)) {
            console.warn("Invalid genotype id '" + geneStrain[0] +
                "' in '" + gene + "'. " +
                "Will continue with next gene selection from URL.");
        } else {
            if (isNaN(sid)) {
                console.warn("Will choose all matching genes" +
                    " with supplied genotype id '" + gid + "'.");
                selectMatchingGenotype(gid);
            } else {
                if (isNaN(cid)) {
                    console.warn("Will choose all matching genes" +
                        " with supplied genotype id '" + gid + "' and" +
                        " strain id '" + sid + "'.");
                    selectMatchingGenotypeStrain(gid, sid);
                } else
                    selectMatchingGenotypeStrainCentre(gid, sid, cid);
            }
        }
    }

    /**
     * Process the list of genotype identifiers that was supplied to the
     * web application as the query parameter 'gid'. The supplied input string
     * is a comma separated list of integer identifiers.
     * 
     * @param {String} genes Comma separated list of genotype identifiers.
     */
    function processListOfGenotypeIds(genes) {
        var temp, i, c;

        selectedGenesMap = {}; /* maps genotype id to gene object */
        geneList = new DoubleLinkedList(GENE_KEY); /* ordered gene selection */

        if (genes && genes !== 'null') {
            temp = genes.split(',');
            if (temp === null || temp.length < 1) {
                alert("Genotype/strain ids must be comma separated");
                return;
            }
            for (i = 0, c = temp.length; i < c; ++i)
                processGeneSelection(temp[i]);
        }
    }

    /**
     * Process the list of parameter keys that was supplied to the
     * web application as the query parameter 'qeid'. The supplied input string
     * is a comma separated list of parameter specifications (e.g., parameter
     * keys, procedure types and MP terms).
     * 
     * @param {[String]} parameters Array of parameter keys.
     */
    function processListOfParameters(parameters) {
        var i, qeid, datum;

        selectedParametersMap = {}; /* maps parameter key to parameter object */
        /* ordered list of selected parameters */
        parameterList = new DoubleLinkedList(PARAMETER_KEY_FIELD);

        if (parameters) {
            for (i in parameters) {
                qeid = parameters[i];
                if (selectedParametersMap[qeid] === undefined) {
                    datum = availableParametersMap[qeid];
                    if (datum === undefined)
                        console.warn("Parameter " + qeid +
                            " is currently unavailable");
                    else
                        addParameterToSelection(qeid, datum);
                } else
                    console.warn("Parameter " + qeid +
                        " has already been specified. Will ignore.");
            }
        }
    }

    /**
     * Sets new dimension for the visualisation control side toolbar.
     */
    function refitSidebar() {
        height('#sidebar', height(body) - height('#header'));
    }

    /**
     * Sets new dimension for the visualisation context.
     */
    function refitContent() {
        height('#content', height(body) - height('#header'));
        width('#content', width(body) - width('#sidebar'));
    }

    /**
     * Set dimension for user interface components in visualisation mode.
     */
    function refitVisualise() {
        height('#cluster', height('#content') - height('#infobar'));
    }

    /**
     * Sets new dimension for the list display.
     */
    function refitList() {
        height('#list-content', height('#list-container') -
            height('#list-header') - height('#list-footer') - 1);
    }

    /**
     * Set dimension for user interface components in configuration mode.
     */
    function refitConfigure() {
        if (heatmap !== null || width('body') < MIN_SCREEN_WIDTH_FOR_DETAILS)
            detailsPanel.hide();

        width('#main-content', width('#content')
            - width('#navigator') - width('#details-panel'));
        if (heatmap === null) {
            refitList();
            detailsPanel.refit();
        } else {
            dcc.refitHeatmapPvalueGrid(heatmap);
        }

        var selectedRow = d3.select('.selected-row');
        if (!selectedRow.empty())
            selectedRow.node().scrollIntoView(true);
    }

    /**
     * When the browser viewport is resized, we must recalculate dimensions
     * and placement for all of the user interface components. The following is
     * the event handler invoked when the browser viewport resizes.
     */
    function resize() {
        smallScreen = width(body) < SMALL_SCREEN_WIDTH;
        refitSidebar();
        refitContent();
        switch (mode) {
            case VISUALISE:
                refitVisualise();
                break;
            case CONFIGURE:
                refitConfigure();
                break;
        }
    }

    /**
     * Initialises the zygosity filter based on web app startup setting.
     */
    function initZygosity() {
        var combined = controlOptions.hom |
            controlOptions.het | controlOptions.hem;
        if ((dcc.visualisationControl & combined) === combined)
            zygosity = ZYGOSITY_ALL;
        else if (dcc.visualisationControl & controlOptions.hom)
            zygosity = ZYGOSITY_HOM;
        else if (dcc.visualisationControl & controlOptions.het)
            zygosity = ZYGOSITY_HET;
        else if (dcc.visualisationControl & controlOptions.hem)
            zygosity = ZYGOSITY_HEM;
    }

    /**
     * Displays the main toolbar at the top of the web application.
     */
    function showToolbar() {
        var header = d3.select('#header'), menu, account;
        addDiv(header, 'impc-logo')
            .attr('title', 'Version ' + dcc.version)
            .on('click', function () {
                mode = CONFIGURE;
                showMode();
            });
        menu = addDiv(header, 'menu');
        addLink(menu, '/', 'IMPC');
        addLink(menu, '../phenodcc-summary', 'Reporting');
        addLink(menu, '../tracker', 'Tracker');
        addLink(menu, '../qc', 'Quality Control');
        addLink(menu, '../impress', 'IMPReSS');
        addLink(menu, 'manual.html', 'Help');
        addDiv(menu, 'bookmark').text('Bookmark').on('click', function () {
            preventEventBubbling();
            var temp = dcc.transientGeneParameter;
            if (temp !== undefined)
                showBookmark(dcc.getGeneStrainCentreId(temp.gene),
                    temp.parameter);
            else
                showBookmark();
        });

        account = addDiv(header, 'account');

        if (dcc.roles) {
            if (dcc.roles.uid === 0) {
                account.append('a').attr('id', 'login-link')
                    .attr('href', '../user/login?destination=/phenoview')
                    .text('sign in');
                addDiv(account, 'user').text('Not logged in');
            } else {
                account.append('a').attr('id', 'login-link')
                    .attr('href', '../user/logout?current=user/')
                    .text('sign out');
                addDiv(account, 'user').text(dcc.roles.name);
            }
        }
    }

    var styleToInline = [
        'stroke', 'stroke-width', 'stroke-linecap',
        'stroke-dasharray', 'stroke-opacity', 'fill', 'fill-opacity',
        'text-anchor', 'font-size', 'font-weight', 'font-family'
    ];
    function inlineStyle(node) {
        var i = 0, c = styleToInline.length, property, computedStyle;
        if (node && node.nodeType === 1) {
            computedStyle = window.getComputedStyle(node, "");
            while (i < c) {
                property = styleToInline[i];
                node.style[property] = computedStyle.getPropertyValue(property);
                ++i;
            }
        }
    }

    function inlineSubtree(node) {
        inlineStyle(node);
        node = node.firstChild;
        while (node) {
            inlineSubtree(node);
            node = node.nextSibling;
        }
    }

    function serializeDomToString(node) {
        return node.outerHTML || new XMLSerializer().serializeToString(node);
    }

    function getImageSaver(td, label) {
        return function () {
            var win = window.open("", "Save visualisation as image"),
                sv = d3.select(win.document.body),
                ic = sv.append('div').attr('class', 'save-image-container'),
                details = ic.append('div').attr('class', 'image-details'),
                cv = ic.append('canvas')
                .style('width', '800px')
                .style('height', '600px'),
                canvas = cv.node(), viz = td.select('svg');
            inlineSubtree(viz.node());
            canvg(canvas, serializeDomToString(viz.node()));
            details.html(label);
            sv = d3.select(win.document.head);
            if (sv.select('link').empty()) {
                sv.append('link')
                    .attr('rel', 'stylesheet')
                    .attr('type', 'text/css')
                    .attr('href', location.origin
                        + '/phenoview/css/saveimage.css');
            }
            win.focus();
        };
    }

    function getImageDetails(gene, parameter) {
        var label = '<table><tbody>', c;
        if (gene !== undefined) {
            c = centresMap[gene.cid];
            if (c !== undefined)
                label += '<tr><td>Centre:</td><td>' + c.f
                    + '</td></tr>';
            label += '<tr><td>Allele:</td><td>' + gene.alleleName
                + '</td></tr><tr><td>Colony:</td><td>' + gene.genotype
                + '</td></tr><tr><td>Strain:</td><td>' + gene.strain
                + '</td></tr>';
        }
        if (parameter !== undefined) {
            label += '<tr><td>Parameter:</td><td>' + parameter.n
                + '</td></tr><tr><td>Parameter key:</td><td>' + parameter.e
                + '</td></tr>';
        }
        return label + '</tbody></table>';
    }

    /**
     * Every visualisation has a toolbar which is displayed at the top of
     * the visualisation. This toolbar is specific to the visualisation and
     * allows a user to download the raw data and to share visualisations
     * using social networking sites.
     * 
     * @param {Object} td The parent DOM node that contains the toolbar.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {String} qeid Parameter key.
     */
    function addVisualisationTools(td, gid, sid, cid, qeid) {
        var geneId = dcc.prepareGeneStrainCentreId(gid, sid, cid),
            tools = addDiv(td, null, 'viz-tools'), shareGroup,
            bookmark = prepareBookmark(geneId, qeid), label;
        shareGroup = addDiv(tools, null, 'share-button')
            .attr('title', 'Share this visualisation');
        addDiv(shareGroup, null, 'email-button')
            .on('click', function () {
                preventEventBubbling();
                showBookmark(geneId, qeid);
            });
        addDiv(tools, null, 'download-button')
            .attr('title', 'Download raw data for this visualisation')
            .on('click', getRawDataDownloader(gid, sid, cid, qeid, bookmark));
        label = getImageDetails(availableGenesMap[geneId],
            availableParametersMap[qeid]);
        addDiv(tools, null, 'save-button')
            .attr('title', 'Save this visualisation as image file')
            .on('click', getImageSaver(td, label));
        addDiv(tools, 'qcstatus-' + geneId + '-' + qeid);
    }

    /**
     * Adds a visualisation cluster row which appends a visualisation for
     * each of the selected genes for the selected parameter.
     * 
     * @param {Object} tr DOM node that represents the row for parameter.
     * @param {Integer} gid Genotype identifier.
     * @param {Integer} sid Strain identifier.
     * @param {Integer} cid Centre identifier.
     * @param {Object} parameter The parameter object. 
     * @param {Integer} index Index inside the array of visualisations.
     * @returns {Object} DOM node that contains the visualisation object.
     */
    function addClusterRow(tr, gid, sid, cid, parameter, index) {
        var id = (gid % 2) + "-" + index,
            td = tr.append("td"),
            vizContainer = td.append("div")
            .attr("class", "loading viz-container-" + id)
            .style("width", visualisationWidth + "px")
            .style("height", getAspectHeight(visualisationWidth) +
                heightExtension + "px");
        vizContainer.index = index;
        vizContainer.centre = cid;
        vizContainer.gene = gid;
        vizContainer.strain = sid;
        vizContainer.parameter = parameter;
        vizContainer.plotType = determinePlotType(parameter);
        if (vizContainer.plotType.t !== STR_IMAGE &&
            typeof parameter !== 'string') {
            var key = parameter[PARAMETER_KEY_FIELD];
            /* Dont't show toolbar for */
            if (key.indexOf('_EVL_') === -1 &&
                key.indexOf('_EVM_') === -1 &&
                key.indexOf('_EVO_') === -1 &&
                key.indexOf('_EVP_') === -1 &&
                key.indexOf('_VIA_') === -1 &&
                key.indexOf('_FER_') === -1)
                addVisualisationTools(td, gid, sid, cid, key);
        }
        return vizContainer;
    }

    /**
     * At the top of the visualisation cluster, we will display overview
     * information such as LacZ expression overview, gross pathology information
     * etc. The conditions under which certain overviews are included will be
     * determined based on the parameter list and the visualisation control
     * setting. For instance, we will display LacZ expression overview if the
     * overview is enabled and at least one of the parameters is an overview
     * parameter. In this function, we add this entry to the visuslisation
     * cluster.
     * 
     * @param {Object} table visualisation cluster table.
     */
    function addOverviewVisualisations(table) {
        if (!(dcc.visualisationControl & controlOptions.overview))
            return;

        var overviewsToShow = {}, tr, k = 0;
        parameterList.traverse(function (parameter) {
            if (parameter.e.indexOf('_ALZ_') !== -1)
                overviewsToShow['ALZ'] = true;
            if (parameter.e.indexOf('_GEP_') !== -1)
                overviewsToShow['GEP'] = true;
            if (parameter.e.indexOf('_GPM_') !== -1)
                overviewsToShow['GPM'] = true;
            if (parameter.e.indexOf('_PAT_') !== -1)
                overviewsToShow['PAT'] = true;
            if (parameter.e.indexOf('_FER_') !== -1)
                overviewsToShow['FER'] = true;
            if (parameter.e.indexOf('_VIA_') !== -1)
                overviewsToShow['VIA'] = true;
        });
        for (var i in overviewsToShow) {
            k = 0;
            tr = table.append('tr');
            geneList.traverse(function (gene) {
                visualisationCluster.push(
                    addClusterRow(tr, gene.gid, gene.sid, gene.cid,
                        'OVERVIEWS_' + i, k++));
            });
        }
        return geneList.count();
    }

    /**
     * Creates the visualisation cluster, which is a two dimensional grid
     * of visualisation where the columns represent the selected gene and
     * the rows represent the selected parameters.
     * 
     * @param {Object} parent DOM node that will contain the cluster.
     */
    function createVisualisationCluster(parent) {
        var table, tr, k = 0, parameter_key;
        parent = addDiv(parent, 'cluster');
        if (geneList.count() > 0 && parameterList.count() > 0) {
            table = parent.append("table").attr("class", "cluster");
            visualisationCluster = [];
            k += addOverviewVisualisations(table);
            parameterList.traverse(function (parameter) {
                tr = table.append('tr');
                parameter_key = parameter.e;
                if (parameter_key.indexOf('_GEP_') === -1 &&
                    parameter_key.indexOf('_GPM_') === -1 &&
                    parameter_key.indexOf('_VIA_') === -1 &&
                    parameter_key.indexOf('_FER_') === -1 &&
                    parameter_key.indexOf('_PAT_') === -1 &&
                    parameter_key.indexOf('_ALZ_') === -1)
                    geneList.traverse(function (gene) {
                        visualisationCluster.push(
                            addClusterRow(tr, gene.gid, gene.sid, gene.cid,
                                parameter, k++));
                    });
            });
        } else
            listIsEmpty(parent);
    }

    /**
     * Creates a single visualisation for the selected gene and
     * parameter. This provides a preview functionality.
     * 
     * @param {Object} parent DOM node that will contain the cluster.
     */
    function createSingleVisualisation(parent) {
        var table, tr, temp = dcc.transientGeneParameter, gene = temp.gene;
        parent = addDiv(parent, 'cluster');
        table = parent.append("table").attr("class", "cluster");
        visualisationCluster = [];
        tr = table.append('tr');
        visualisationCluster.push(
            addClusterRow(tr, gene.gid, gene.sid, gene.cid,
                availableParametersMap[temp.parameter], 0));
    }

    function attachVisualisationEventHandlers() {
        d3.select('#cluster')
            .on("scroll", function () {
                preventEventBubbling();
                informationBox.classed('hidden', true);
                scrollInfobar(d3.event);
                throttle(refreshVisualisationCluster, EVENT_THROTTLE_DELAY, null);
            });
    }

    /**
     * Display visualisation mode user interfaces.
     * @param {Object} content Content area in the UI foundation.
     */
    function showVisualise(content) {
        /* for single visualisation, show a larger visualisation */
        if (dcc.transientGeneParameter !== undefined) {
            visualisationWidth = ZOOM_LARGE;
        }
        showVisualisationControls();
        if (dcc.transientGeneParameter === undefined) {
            showInfobar(content);
            createVisualisationCluster(content);
        } else {
            showSingleGeneInfobar(content);
            createSingleVisualisation(content);
        }
        attachVisualisationEventHandlers();
        resize();
    }

    /**
     * Checks if the visualisation is visible inside the visualisation cluster
     * viewport.
     * 
     * @param {Object} vizContainer Visualisation container DOM node.
     * @param {Object} parent DOM node for visualisation cluster viewport.
     * @returns {Boolean} True of visualisation is visible.
     */
    function isVisualisationVisible(vizContainer, parent) {
        var vizDim = vizContainer.node().getBoundingClientRect(),
            parentDim = parent.node().getBoundingClientRect();
        return !(vizDim.top > parentDim.bottom ||
            vizDim.bottom < parentDim.top ||
            vizDim.left > parentDim.right ||
            vizDim.right < parentDim.left);
    }

    /**
     * Renders a visualisation by plotting the measurements. Only render if
     * it is not already rendered.
     * 
     * @param {Object} vizContainer Visualisation container DOM node.
     */
    function renderVisualisation(vizContainer) {
        if (vizContainer.isRendered)
            return;
        var geneId =
            dcc.prepareGeneStrainCentreId(vizContainer.gene,
                vizContainer.strain,
                vizContainer.centre);
        plotParameter('viz-' + geneId + "-" + vizContainer.parameter.e +
            "-" + vizContainer.index, vizContainer);
        vizContainer.isRendered = true;
    }

    /**
     * Refresh all of the visualisations in the visualisation cluster.
     * 
     * @param {Boolean} forced If true, the visualisation will be re-rendered.
     */
    function refreshVisualisationCluster(forced) {
        var i, c = visualisationCluster.length, p,
            vizContainer, clusterNode, isVisible;
        if (c > 0) {
            clusterNode = d3.select('#cluster');
            for (i = 0; i < c; ++i) {
                vizContainer = visualisationCluster[i];
                p = vizContainer.parameter;
                if (typeof p === 'string' && p.indexOf('OVERVIEWS_') !== -1) {
                    if (dcc.visualisationControl & controlOptions.overview)
                        vizContainer.style('display', 'block');
                    else
                        vizContainer.style('display', 'none');
                }

                vizContainer.isVisible = isVisible =
                    isVisualisationVisible(vizContainer, clusterNode);
                if (forced || !isVisible) {
                    vizContainer.isRendered = false;
                    clear(vizContainer);
                    vizContainer.classed('loading', true);
                }
                if (isVisible && (!vizContainer.isRendered ||
                    !vizContainer.viz)) {
                    renderVisualisation(vizContainer);
                }
            }
            if (c === 1) {
                vizContainer = visualisationCluster[0];
                if (vizContainer.plotType.t === STR_IMAGE)
                    vizContainer.select('.start-image-viewer').on('click')();
            }
        }
    }

    /**
     * Display the current mode, and fill in the require user interfaces.
     */
    function showMode() {
        var content = d3.select('#content');
        clear(content);
        setCookie('mode', mode);
        switch (mode) {
            case VISUALISE:
                setDatapointRadius(ZOOM_SMALL);
                showVisualise(content);
                refreshVisualisationCluster();
                break;
            case CONFIGURE:
                showConfigure();
                break;
        }
    }

    dcc.visualiseSelection = function () {
        var sidebar = d3.select('#sidebar');
        mode = VISUALISE;
        sidebar.style('display', 'block')
            .style('width', sidebar.savedWidth);
        showMode();
    };

    /**
     * Display user interface framework which provides the DOM node foundation
     * for displaying the mode specific controls.
     */
    function showUIFramework() {
        clear(body);
        addDiv(body, 'header');
        addDiv(body, 'content');
        addDiv(body, 'sidebar');
        showToolbar();
        showMode();
        createInformationBox();
        window.onresize = resize;
    }

    /**
     * Start phenoview engine.
     * 
     * @param {String} genesString Comma separated list of genotype ids.
     * @param {[String]} parameters Array of parameter keys.
     */
    function startEngine(genesString, parameters) {
        loadConfigData(body, function () {
            processListOfGenotypeIds(genesString);
            processListOfParameters(parameters);
            if (geneList.count() === 0 || parameterList.count() === 0)
                mode = CONFIGURE;
            initZygosity();
            showUIFramework();

        }, genesString, parameters);
    }

    /**
     * Entry function to the phenoview tool. This function is invoked by the
     * JSP page.
     * 
     * @param {String} genesString Comma separated list of genotype ids.
     * @param {String} parametersString Comma separated list of parameter specs.
     */
    dcc.visualise = function (genesString, parametersString) {
        var restoreState = false;

        /* JSP sets the value to 'null' when query params are unspecified */
        if (genesString === 'null') {
            restoreState = true;

            /* see if genes were saved in the browser cookies */
            genesString = getCookie('genes');
        }
        if (parametersString === 'null') {
            restoreState = true;

            /* see if parameters were saved in the browser cookies */
            parametersString = getCookie('parameters');
        }

        /* if p-value threshold was supplied in the URL, overwrite cookie value.
         * if p-value threshold was not supplied, use cookie value if exists.
         * otherwise, use default app value. */
        if (dcc.pvalueThreshold === undefined) {
            var savedPvalueThreshold = getCookie('pvalue_threshold');
            if (savedPvalueThreshold === undefined ||
                savedPvalueThreshold === '')
                dcc.pvalueThreshold = DEFAULT_PVALUE_THRESHOLD;
            else
                dcc.pvalueThreshold = savedPvalueThreshold;
            setCookie('pvalue_threshold', dcc.pvalueThreshold);
        }

        /* we only wish to return to the last state if the genes or
         * parameters were not explicitly specified in the URL. */
        if (restoreState) {
            stateToReturnTo = getCookie('state');
            centreShowingDetails = getCookie('centre');
            geneShowingDetails = getCookie('gene');
            procedureShowingDetails = getCookie('procedure');
            mode = getCookie('mode');
        }

        if (genesString === undefined || parametersString === undefined)
            startEngine(genesString, parametersString);
        else
            d3.json('rest/expand?gids=' + genesString +
                '&types=' + parametersString, function (data) {
                    if (data && data.success)
                        startEngine(genesString, data.parameters);
                    else
                        startEngine(genesString, undefined);
                });
    };

    function showSelectedGenes(parent) {
        d3.select('#genes-basket-browse').classed('navigator-selected', true);
        isSimpleList = false;
        filterBy.centre = null;
        var list = showListUIFrameWork(parent), header = list.header;
        showSelectedGeneList(list.content);
        showSelectedGeneListHeader(header);
        showSelectedGeneListControls(header);
        showListPager(list.footer);
        refitList();
    }

    function showSelectedParameters(parent) {
        d3.select('#parameters-basket-browse')
            .classed('navigator-selected', true);
        isSimpleList = false;
        filterBy.procedure = null;
        var list = showListUIFrameWork(parent),
            header = list.header, content = list.content;
        showSelectedParameterList(content);
        showSelectedParameterListHeader(header);
        showSelectedParameterListControls(header);
        showListPager(list.footer);
        refitList();
    }

    function showSelectedGeneList(parent) {
        filterBy.centre = null;
        var selector = new Selector('gene', parent, geneList,
            selectedGenesMap, GENE_KEY, addDetailedGeneFields,
            getGeneListFilter());
        selector.show();
    }

    function showSelectedParameterList(parent) {
        filterBy.centre = null;
        var selector = new Selector('parameter', parent, parameterList,
            selectedParametersMap, PARAMETER_KEY_FIELD,
            addDetailedParameterFields,
            getParameterListFilter());
        selector.show();
    }

    function listIsEmpty(parent) {
        clear(parent);
        addDiv(parent, null, 'no-selection', 'The list is empty');
    }

    function showSelectedGeneListHeader(parent) {
        new SearchBox(parent, 'gene', function (value) {
            if (value !== undefined) {
                filterBy.text = value.toLowerCase();
                showSelectedGeneList(d3.select('#list-content'));
            }
        }, 'search within selected genes by allele, strain or genotype');
    }

    function showSelectedParameterListHeader(parent) {
        new SearchBox(parent, 'parameter', function (value) {
            if (value !== undefined) {
                filterBy.text = value.toLowerCase();
                showSelectedParameterList(d3.select('#list-content'));
            }
        }, 'search within selected parameters by key or name');
    }

    function showSelectedGeneListControls(parent) {
        addDiv(parent, null, 'empty-selection', 'Empty selection')
            .on('click',
                function () {
                    preventEventBubbling();
                    emptyGeneSelection();
                    listIsEmpty(d3.select('#list-content'));
                });
    }

    function showSelectedParameterListControls(parent) {
        addDiv(parent, null, 'empty-selection', 'Empty selection')
            .on('click',
                function () {
                    preventEventBubbling();
                    emptyParameterSelection();
                    listIsEmpty(d3.select('#list-content'));
                });
    }

    var DetailsPanel = function (parent) {
        /* Four modes:
         * 1. Centre details (show centre details)
         * 2. Gene details (show procedures and parameters with data)
         * 3. Procedures mode (show procedure details)
         */
        this.mode = -1;
        this.parent = parent;
        this.sectionTitle = [
            "Purpose", "Experimental design", "Equipment", "Notes"
        ];
        this.init();
    };

    function getVisualisationPreviewHandler(geneId, parameterKey) {
        return function () {
            dcc.transientGeneParameter = {
                'gene': availableGenesMap[geneId],
                'parameter': parameterKey
            };
            dcc.visualiseSelection();
        };
    }
    DetailsPanel.prototype = {
        init: function () {
            var me = this;
            me.parent = addDiv(me.parent, 'details-panel');
            me.hide();
        },
        hide: function () {
            var me = this;
            me.parent.style('display', 'none');
        },
        show: function () {
            var me = this;
            me.parent.style('display', 'block');
        },
        changeMode: function (mode) {
            var me = this, parent = me.parent;
            me.show();
            clear(parent);
            switch (mode) {
                case CENTRE_DETAILS:
                    me.node = addDiv(parent, 'centre-details');
                    me.proc = addDiv(me.node, 'procedures-with-data');
                    me.procName = addDiv(me.node, 'procedure-name');
                    me.mode = mode;
                    break;
                case PROCEDURES_AND_PARAMS_WITH_DATA:
                    me.title = addDiv(parent, 'with-data-title');
                    me.node = addDiv(parent, 'with-data');
                    me.proc = addDiv(me.node, 'procedures-with-data');
                    me.procName = addDiv(me.node, 'procedure-name');
                    me.procTitle = addDiv(me.node, 'procedure-with-data');
                    me.param = addDiv(me.node, 'parameters-with-data');
                    me.mode = mode;
                    break;
                case PROCEDURE_DETAILS:
                    me.node = addDiv(parent, 'procedure-details');
                    me.mode = mode;
                    break;
            }
            me.refit();
        },
        getParametersHandler: function (procedure, context) {
            var me = this, cls = 'selected-procedure';
            return function () {
                var node = d3.select(this);
                procedureShowingDetails = procedure.c;
                setCookie('procedure', procedureShowingDetails);
                d3.select(node.node().parentNode)
                    .select('.' + cls).classed(cls, false);
                node.classed(cls, true);
                me.procTitle.html(procedure.n);
                d3.json("rest/available/" + procedure.i
                    + '?cid=' + context.cid
                    + '&gid=' + context.gid
                    + '&sid=' + context.sid, function (data) {
                        var n = me.param, temp, i, c, p, t;
                        clear(n);
                        if (data.success) {
                            temp = data.available;
                            for (i = 0, c = temp.length; i < c; ++i) {
                                p = availableParametersMap[parameterIdToKeyMap[temp[i]]];
                                /* if parameter is not in availableParametersMap, it
                                 * means that the parameter is either meta-data or
                                 * unplottable. */
                                if (p) {
                                    t = addDiv(n, null, 'gene-details-parameter-preview')
                                        .attr('title', 'Click to preview visualisation');
                                    addDiv(t, null, 'parameter-id', p.e);
                                    addDiv(t, null, 'parameter-name', p.n);
                                    t.on('click', getVisualisationPreviewHandler(geneShowingDetails, p.e));

                                    var basket = dcc.getParameterBasket(p);
                                    addDiv(n, null, basket.cls).on('click', basket.onclick);
                                }
                            }
                        }
                        me.refit();
                    });
            };
        },
        getProcedureNameSetter: function (p) {
            var me = this;
            return function () {
                me.procName.html(p.n);
            };
        },
        showProceduresWithData: function (available, context, noParameters) {
            var me = this, i, c, proc, details = me.proc,
                temp = [], alreadyIn = {}, defaultCellToSelect;

            clear(details);
            me.procName.html('');
            for (i = 0, c = available.length; i < c; ++i) {
                proc = procedureKeyToProcedureDetailsMap[available[i]];
                if (alreadyIn[proc.c] === undefined) {
                    alreadyIn[proc.c] = 1;
                    temp.push({
                        'c': proc.c,
                        'p': proc
                    });
                }
            }
            temp.sort(getComparator('c'));
            for (i in temp) {
                proc = temp[i];
                c = details.append('div')
                    .attr('class', 'small-param-icon')
                    .style('background-color', procedureColour[proc.c])
                    .text(proc.c);
                if (noParameters === undefined) {
                    if (procedureShowingDetails === proc.c)
                        defaultCellToSelect = c;
                    c.on('click', me.getParametersHandler(proc.p, context));
                } else
                    c.on('mouseenter', me.getProcedureNameSetter(proc.p));
            }
            if (defaultCellToSelect === undefined)
                defaultCellToSelect = details.select('.small-param-icon');
            temp = defaultCellToSelect.on('click');
            if (temp)
                temp.call(defaultCellToSelect.node());
        },
        addLineDetails: function (datum) {
            var me = this, title = me.title;
            clear(title);
            title.append('img')
                .attr('src', 'images/logo_' + centresMap[datum.cid].s + '.png');
            addDiv(title).html('<b>Centre:</b> ' + centresMap[datum.cid].f);
            addDiv(title).html('<b>Strain:</b> ' + datum.strain);
            addDiv(title).html('<b>Genotype:</b> ' + datum.genotype);
            addDiv(title).html('<b>Allele:</b> '
                + (datum.alleleName ? datum.alleleName
                    : datum.geneSymbol));
        },
        showProcedureDetails: function (procedureId) {
            var me = this, n = me.node;
            clear(n);
            d3.json('rest/procedure/details/' + procedureId, function (data) {
                var i, c;
                if (data) {
                    addDiv(n, null, null,
                        procedureKeyToProcedureDetailsMap[procedureId].n);
                    for (i = 0, c = data.length; i < c; ++i) {
                        addDiv(n, null, 'section-title', me.sectionTitle[i]);
                        n.append('div').html(data[i]);
                    }
                    n.append('a')
                        .attr('href', '/impress/protocol/' + procedureId)
                        .attr('target', '_blank')
                        .text('Click here for further details...')
                        .attr('class', 'further-details');
                }
            });
        },
        showCentreActivity: function (cid) {
            var me = this, n = me.node, activities;
            clear(n);
            activities = centreActivity[cid];
        },
        update: function (datum) {
            var me = this;
            me.parent.style('display', 'block');
            switch (me.mode) {
                case 1: /* centre details */
                    d3.json('rest/available/centre/' + datum,
                        function (data) {
                            if (data && data.success)
                                me.showProceduresWithData(data.available,
                                    datum, true);
                            else {
                                clear(me.proc);
                                me.refit();
                            }
                        });
                    break;
                case 2: /* procedures and parameters with data */
                    me.addLineDetails(datum);
                    clear(me.param);
                    d3.json('rest/available?cid=' + datum.cid +
                        '&gid=' + datum.gid + '&sid=' + datum.sid,
                        function (data) {
                            if (data && data.success)
                                me.showProceduresWithData(data.available, datum);
                            else {
                                clear(me.proc);
                                me.refit();
                            }
                        });
                    break;
                case 3: /* procedure details */
                    if (datum instanceof Array)
                        me.showProcedureDetails(datum[0]);
                    else
                        me.showProcedureDetails(datum);
                    break;
            }
        },
        refit: function () {
            var me = this;
            switch (me.mode) {
                case 1: /* centre details */
                    break;
                case 2: /* procedures and parameters with data */
                    height(me.param, height(me.parent)
                        - height(me.title) - height(me.proc)
                        - height(me.procTitle));
                    break;
                case 3: /* procedure details */
                    break;
            }
        }
    };

    var Selector = function (mode, parent, list, map, key,
        entryMaker, filterOut) {
        this.mode = mode;
        this.parent = parent;
        this.list = list;
        this.map = map;
        this.key = key;
        this.entryMaker = entryMaker;
        this.filterOut = filterOut;
    };

    Selector.prototype = {
        show: function () {
            var me = this, key = me.key, parent = me.parent, list = me.list;

            clear(parent);
            if (list.count() > 0) {
                var tr, index = 0, table = parent.append('table'),
                    keyValue, filterOut = me.filterOut;

                table.append('tr').append('td');
                list.traverse(function (datum) {
                    if (filterOut(datum))
                        return;
                    keyValue = datum[key];
                    tr = table.append('tr')
                        .attr('class', (index % 2 ? 'odd' : 'even') + '-row')
                        .attr('target_index', index++)
                        .classed('draggable', true)
                        .on('mousedown', getDragStartHandler(me, keyValue, datum))
                        .on('mousemove', getDragHandler())
                        .on('mouseover', getDragMouseOverHandler())
                        .on('mouseup', getDragStopHandler(me));
                    me.entryMaker(tr, datum);

                    addDiv(tr.append('td'), null, 'remove-button')
                        .on('mousedown',
                            getRemoveFromSelectionHandler(me, keyValue, parent));
                });
            } else
                listIsEmpty(parent);
        }
    };

    function getDragStartHandler(selector, key, datum) {
        return function () {
            preventEventBubbling();
            var item = createDraggedItem(selector, datum,
                body, d3.mouse(this)[0]);

            body.classed('unselectable', true)
                .on('mouseup.drag', function () {
                    preventEventBubbling();
                    moveItemToNewLocation(selector);
                })
                .on('mousemove.drag', function () {
                    preventEventBubbling();
                    positionDraggedItem(item);
                });

            isDraggingInProgress = true;
            draggedKey = key;
            selector.show();
        };
    }

    function createDraggedItem(selector, datum, parent, displacement) {
        parent.selectAll('#dragged-item').remove();
        var draggedItem = addDiv(parent, 'dragged-item');
        draggedItem.style('opacity', '0');
        draggedItem.leftDisplacement = displacement - 8;
        positionDraggedItem(draggedItem);

        selector.entryMaker(draggedItem.append('table').append('tr'), datum);

        show(draggedItem, 400);
        return draggedItem;
    }

    function destroyDraggedItem() {
        hideAndDestroy(d3.select('#dragged-item'));
    }

    function positionDraggedItem(draggedItem) {
        var pos = d3.mouse(document.body);
        draggedItem.style('left', pos[0] - draggedItem.leftDisplacement + 'px')
            .style('top', pos[1] + 15 + 'px');
    }

    function getDragHandler() {
        return function () {
            preventEventBubbling();
            if (isDraggingInProgress) {
                var node = d3.select(this),
                    sibling = d3.select(this.previousSibling),
                    insertBelow = getDragPositionRelativeToRow(node);
                dragDropIndex = insertBelow +
                    parseInt(node.attr('target_index'), 10);
                if (insertBelow) {
                    sibling.classed(DRAG_MARKER, false);
                    node.classed(DRAG_MARKER, true);
                } else {
                    node.classed(DRAG_MARKER, false);
                    sibling.classed(DRAG_MARKER, true);
                }
            }
        };
    }


    function getDragMouseOverHandler() {
        return function () {
            preventEventBubbling();
            if (isDraggingInProgress) {
                previousDragOverRow = currentDragOverRow;
                currentDragOverRow = d3.select(this);
                if (previousDragOverRow) {
                    d3.select(previousDragOverRow.node().previousSibling)
                        .classed(DRAG_MARKER, false);
                    previousDragOverRow.classed(DRAG_MARKER, false);
                }
            }
        };
    }

    function getDragPositionRelativeToRow(node) {
        var height = parseInt(node.style('height'), 10),
            mousePosition = d3.mouse(node.node());

        /* 0: insert above, 1: insert below */
        return mousePosition[1] > height * 0.5 ? 1 : 0;
    }

    function getDragStopHandler(selector) {
        return function () {
            preventEventBubbling();
            if (isDraggingInProgress) {
                body.classed('unselectable', false);
                moveItemToNewLocation(selector);
            }
        };
    }

    function moveItemToNewLocation(selector) {
        if (draggedKey && dragDropIndex >= 0) {
            selector.list.moveTo(draggedKey, dragDropIndex);
            body.on('mouseup.drag');
            destroyDraggedItem();
            isDraggingInProgress = false;
            draggedKey = null;
            selector.show();
        }
    }

    function getAddToSelectionHandler(selector, key, datum) {
        return function () {
            preventEventBubbling();

            /* add item to selection */
            selector.tempHashmap[key] = datum;
            selector.tempList.append(datum);

            /* remove item from selectable items list */
            removeRowFromList(d3.select(this));
        };
    }

    function getRemoveFromSelectionHandler(selector, key, parent) {
        return function () {
            preventEventBubbling();

            /* use clicked on the remove icon:
             * table > tr > td > icon */
            var tr = d3.select(this.parentNode.parentNode);
            d3.select(this).remove();
            removeRowFromList(tr);
            switch (selector.mode) {
                case 'gene':
                    if (removeGeneFromSelection(key) === 0)
                        listIsEmpty(parent);
                    break;
                case 'parameter':
                    if (removeParameterFromSelection(key) === 0)
                        listIsEmpty(parent);
                    break;
            }
        };
    }

    function removeRowFromList(tr) {
        tr.transition().duration(300).style('opacity', 0);
        tr.select('td')
            .selectAll('*').transition().duration(300).style('height', "0px")
            .each("end", function () {
                tr.remove();
            });
    }

    var SearchBox = function (parent, id, onChange, emptyText) {
        this.parent = parent;
        this.id = id;
        this.onChange = onChange;
        this.emptyText = 'Type here to ' + emptyText;
        this.render();
    };

    SearchBox.prototype = {
        render: function () {
            var me = this,
                root = addDiv(me.parent, me.id + '-searchbox', 'searchbox'),
                inputBox = root.append('input').attr('placeholder',
                me.emptyText),
                inputBoxNode = inputBox.node(),
                clearBox = addDiv(root, null, 'clear-searchbox')
                .style('display', 'none');
            me.onkeyup = function () {
                preventEventBubbling();
                if (inputBoxNode.value === '') {
                    clearBox.style('display', 'none');
                    inputBox.classed('hide-glass', false);
                } else {
                    inputBox.classed('hide-glass', true);
                    clearBox.style('display', 'block');
                }
                me.onChange(inputBoxNode.value);
            };

            inputBox.on('keyup', function () {
                throttle(me.onkeyup, SEARCH_THROTTLE_DELAY, me);
            });

            clearBox.on('click', function () {
                preventEventBubbling();
                inputBoxNode.value = '';
                clearBox.style('display', 'none');
                inputBox.classed('hide-glass', false);
                me.onChange('');
            });
            me.onChange();
            me.inputBox = inputBox;
            me.clearBox = clearBox;
        },
        set: function (value) {
            var me = this, inputBox = me.inputBox,
                inputBoxNode = inputBox.node();
            inputBoxNode.value = value;
            inputBox.on('keyup')();
        }
    };

    /**
     * Returns the population standard deviation of a column group with
     * the same x-axis key value.
     *
     * @param {Object} statistics The statistics object.
     * @param {Object} groupKey The key that was used to group data points
     *     into a column.
     */
    function getColumnStandardDeviation(statistics, groupKey) {
        var columnStatistics = statistics.c.c,
            indexInStatisticsTable = statistics.c.i[groupKey];
        return columnStatistics[indexInStatisticsTable].s.sd;
    }

    /**
     * Returns the standard error for a column group with the same x-axis
     * key value.
     *
     * @param {Object} statistics The statistics object.
     * @param {Object} groupKey The key that was used to group data points
     *     into a column.
     */
    function getColumnStandardError(statistics, groupKey) {
        var columnStatistics = statistics.c.c,
            indexInStatisticsTable = statistics.c.i[groupKey];
        return columnStatistics[indexInStatisticsTable].s.se;
    }


    function isMale(dataPoint) {
        return dataPoint.s === 1;
    }

    function filterByGender(temp, viz) {
        var datum, i, l, data = [], showMale = viz.isActiveCtrl('male'),
            showFemale = viz.isActiveCtrl('female');

        if (showMale && showFemale)
            return temp;
        else {
            if (showMale)
                for (i = 0, l = temp.length; i < l; ++i) {
                    datum = temp[i];
                    if (isMale(datum))
                        data.push(datum);
                }
            else if (showFemale)
                for (i = 0, l = temp.length; i < l; ++i) {
                    datum = temp[i];
                    if (!isMale(datum))
                        data.push(datum);
                }
        }
        return data;
    }

    var Beeswarm = function (data, xaxis, radius) {
        this.data = data;
        this.xaxis = xaxis;
        this.radius = radius;
    };

    var scaledYComparator = getComparator('sy');
    Beeswarm.prototype = {
        swarm: function (leaning, bound) {
            var me = this, s = [], x = me.xaxis, v, ub, lb,
                r = me.radius, data = me.data, i, c = data.length;
            data.sort(scaledYComparator);
            ub = x + bound;
            lb = x - bound;
            for (i = 0; i < c; ++i) {
                v = get_x(i, data[i], s, x, r, leaning);
                if (v > ub)
                    v = ub;
                if (v < lb)
                    v = lb;
                data[i].sx = v;
            }
            return data;
        }
    };

    function find_intersections(circle, height) {
        var effective_height = height - circle.y,
            diameter = 2 * circle.radius;
        if (effective_height > diameter)
            return undefined;

        var cx = circle.x,
            x = Math.sqrt(diameter * diameter -
                effective_height * effective_height),
            index = circle.index;
        return {
            'p1': {
                'index': index,
                'isEnd': false,
                'isValid': true,
                'x': cx - x,
                'y': height
            },
            'p2': {
                'index': index,
                'isEnd': false,
                'isValid': true,
                'x': cx + x,
                'y': height
            }
        };
    }

    function find_candidate_intervals(height, swarm_boundary) {
        var i = 0, c = swarm_boundary.length, possible_intervals = [];
        while (c--) {
            var isects = find_intersections(swarm_boundary[i], height);
            if (isects === undefined) {
                swarm_boundary.splice(i, 1);
                continue;
            }
            possible_intervals.push(isects.p1);
            possible_intervals.push(isects.p2);
            ++i;
        }
        return possible_intervals;
    }

    var intervalComparator = getComparator('x', 'index');
    function remove_invalid_intervals(intervals) {
        var c = intervals.length, valid_intervals = [], start;
        if (c < 1)
            return valid_intervals;

        var i, j;
        intervals.sort(intervalComparator);
        for (i = 0; i < c; ++i) {
            start = intervals[i];
            if (start.isEnd)
                continue;
            for (j = i + 1; j < c; ++j) {
                if (start.index === intervals[j].index) {
                    intervals[j].isEnd = true;
                    break;
                } else
                    intervals[j].isValid = false;
            }
        }
        for (i = 0; i < c; ++i)
            if (intervals[i].isValid)
                valid_intervals.push(intervals[i]);
        return valid_intervals;
    }

    var distanceComparator = getComparator('d');
    function choose_x(intervals, xaxis, leaning) {
        var i, c = intervals.length, distance = [], x;
        for (i = 0; i < c; ++i) {
            x = intervals[i].x;
            if ((leaning === 'l' && x > xaxis) ||
                (leaning === 'r' && x < xaxis))
                continue;
            distance.push({
                'i': i,
                'd': Math.abs(xaxis - x)
            });
        }
        distance.sort(distanceComparator);
        return intervals[distance[0].i].x;
    }

    function get_x(index, datum, swarm_boundary, xaxis, radius, leaning) {
        var x, y = datum.sy,
            isects = find_candidate_intervals(y, swarm_boundary),
            preferred_choice = {
                'index': index,
                'isEnd': false,
                'isValid': true,
                'x': xaxis,
                'y': y
            };
        isects.push(preferred_choice);
        isects.push(preferred_choice);
        isects = remove_invalid_intervals(isects);
        x = choose_x(isects, xaxis, leaning);
        swarm_boundary.push({
            'index': index,
            'x': x,
            'y': y,
            'radius': radius
        });
        return x;
    }

    /* colours from http://tools.medialab.sciences-po.fr/iwanthue/index.php */
    var iWantHue = ["#6F5F2E",
        "#EE3FF2",
        "#44E337",
        "#3AA6E9",
        "#F52D19",
        "#55ECCC",
        "#69255A",
        "#F5ED30",
        "#ECB5C5",
        "#5864DD",
        "#EE417D",
        "#2D7F21",
        "#F2E0A1",
        "#2E7A6F",
        "#E88269",
        "#E8A11E",
        "#611419",
        "#D696EB",
        "#123556",
        "#9BE276",
        "#172414",
        "#A6CBCA",
        "#886063",
        "#B03CA3",
        "#A21A18",
        "#7873B1",
        "#D2671B",
        "#ACA02D",
        "#F421A3",
        "#45D5EF",
        "#8FB879",
        "#B7668E",
        "#894711",
        "#6A889B",
        "#33510B",
        "#C4924D",
        "#563D91",
        "#57F29A",
        "#C7A282",
        "#922D4D",
        "#B6CAF1",
        "#431C2A",
        "#A85FD7",
        "#32AD2B",
        "#CBEB5B",
        "#7F8769",
        "#3576D3",
        "#3C210F",
        "#51AC8A",
        "#E23755",
        "#D5D0B6",
        "#35363B",
        "#F0C961",
        "#9AF034",
        "#E66FBE",
        "#B6AD65",
        "#9B226E",
        "#E9788F",
        "#40457C",
        "#C88683",
        "#AB4645",
        "#EB3D3B",
        "#AEE3B1",
        "#83C13A",
        "#AA84AD",
        "#371A40",
        "#234B42",
        "#5CEA71",
        "#4AA463",
        "#489DA3",
        "#E841D0",
        "#8F741E",
        "#E6B6EF",
        "#AD6950",
        "#E86B46",
        "#D5EA7F",
        "#743E25",
        "#E277E4",
        "#5FEAE7",
        "#A683EC",
        "#C655EA",
        "#886B52",
        "#E3DB56",
        "#B069BB",
        "#62445A",
        "#86778A",
        "#6DA244",
        "#41865D",
        "#E0EBF1",
        "#485764",
        "#8CE092",
        "#B47522",
        "#7E2314",
        "#76914E",
        "#E28BBC",
        "#27612E",
        "#B2AAA4",
        "#E2609B",
        "#2A52B3",
        "#5E112D",
        "#EEBA84",
        "#63C7B6",
        "#8EEB5F",
        "#AC9BED",
        "#686A62",
        "#EDD4E9",
        "#623D3C",
        "#84A4DE",
        "#54741B",
        "#9ADFF4",
        "#97AD37",
        "#EA521C",
        "#4BDDA0",
        "#4979B3",
        "#EA6269",
        "#CE4A42",
        "#7B8DF7",
        "#F4C231",
        "#8C8B35",
        "#48C474",
        "#33717D",
        "#8B66EE",
        "#575639",
        "#7F4E76",
        "#50B7DD",
        "#936831",
        "#AF4522",
        "#E5854F",
        "#8E3889",
        "#B836BA",
        "#5D2C6F",
        "#53C055",
        "#BF516E",
        "#7EAEA3",
        "#3F8AAD",
        "#D73CA1",
        "#9AAEBE",
        "#376145",
        "#1B224E",
        "#9D885C",
        "#295574",
        "#E8A14D",
        "#B0E9D8",
        "#BFB51F",
        "#A72239",
        "#221C2C",
        "#D3E6A9",
        "#243613",
        "#70CF28",
        "#E1BFB5",
        "#484A0B",
        "#E5D37A",
        "#63847B",
        "#AC7D92",
        "#854050",
        "#988A7E",
        "#C33319",
        "#B2DB2E",
        "#EA2D8D",
        "#7E3C9B",
        "#BBD986",
        "#99B187",
        "#84ADD2",
        "#77589C",
        "#44385B",
        "#5598F3",
        "#B56779",
        "#57402C",
        "#55A017",
        "#5B6E8F",
        "#F0A496",
        "#4B1235",
        "#CE8B6D",
        "#AC508D",
        "#88EFB6",
        "#ED8625",
        "#6B6C22",
        "#CFA5CC",
        "#72CAD4",
        "#B8931F",
        "#C1AA4E",
        "#A18746",
        "#A970A9",
        "#CFBF8C",
        "#415E91",
        "#838CBD",
        "#AD9AB5",
        "#653A0C",
        "#B3B1E6",
        "#EEA470",
        "#D995A8",
        "#6259B0",
        "#AC8DCF",
        "#36201F",
        "#755AC9",
        "#B65F30",
        "#7B698E",
        "#DDAA41",
        "#E3EFC4",
        "#80804B",
        "#9668CA",
        "#C72865",
        "#CE8752",
        "#49612A",
        "#783A34",
        "#C39568",
        "#8E909C",
        "#859C9A",
        "#19302F",
        "#474C3F",
        "#2D4E9E",
        "#647B53",
        "#903F2A",
        "#D890D4",
        "#8B5C14",
        "#1F3545",
        "#6BB2E5",
        "#328BBF",
        "#6175C6",
        "#3E86F4",
        "#E3E4D5",
        "#30270E",
        "#759EE9",
        "#6D8F6F",
        "#9A554B",
        "#B7DAEA",
        "#4A3640",
        "#D9766E",
        "#316BDC",
        "#ADB19B",
        "#B3928E",
        "#613F1F",
        "#4B1D13",
        "#2F306D",
        "#3681C9",
        "#F1B1D7",
        "#A86837",
        "#916942",
        "#29251F",
        "#CFB9D0",
        "#EF25B2",
        "#4C4BB3",
        "#5A70D3",
        "#BEC6DE",
        "#514617",
        "#D6D3DA",
        "#DFE73A",
        "#483C83",
        "#982356",
        "#6B77F6"];

})();

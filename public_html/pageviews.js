(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var templates = require('./templates');
var pv = require('./shared/pv');

var config = {
  articleSelector: '.aqs-article-selector',
  chart: '.aqs-chart',
  chartConfig: {
    Line: {
      opts: {
        bezierCurve: false,
        legendTemplate: templates.linearLegend
      },
      dataset: function dataset(color) {
        return {
          fillColor: 'rgba(0,0,0,0)',
          pointColor: color,
          pointHighlightFill: '#fff',
          pointHighlightStroke: color,
          pointStrokeColor: '#fff',
          strokeColor: color
        };
      }
    },
    Bar: {
      opts: {
        barDatasetSpacing: 0,
        barValueSpacing: 0,
        legendTemplate: templates.linearLegend
      },
      dataset: function dataset(color) {
        return {
          fillColor: pv.rgba(color, .5),
          highlightFill: pv.rgba(color, .75),
          highlightStroke: color,
          strokeColor: pv.rgba(color, .8)
        };
      }
    },
    Pie: {
      opts: {
        legendTemplate: templates.circularLegend
      },
      dataset: function dataset(color) {
        return {
          color: color,
          highlight: pv.rgba(color, 0.8)
        };
      }
    },
    Doughnut: {
      opts: {
        legendTemplate: templates.circularLegend
      },
      dataset: function dataset(color) {
        return {
          color: color,
          highlight: pv.rgba(color, 0.8)
        };
      }
    },
    PolarArea: {
      opts: {
        legendTemplate: templates.circularLegend
      },
      dataset: function dataset(color) {
        return {
          color: color,
          highlight: pv.rgba(color, 0.8)
        };
      }
    },
    Radar: {
      opts: {
        legendTemplate: templates.linearLegend
      },
      dataset: function dataset(color) {
        return {
          fillColor: pv.rgba(color, 0.1),
          pointColor: color,
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: color,
          strokeColor: color
        };
      }
    }
  },
  circularCharts: ['Pie', 'Doughnut', 'PolarArea'],
  colors: ['rgba(171, 212, 235, 1)', 'rgba(178, 223, 138, 1)', 'rgba(251, 154, 153, 1)', 'rgba(253, 191, 111, 1)', 'rgba(202, 178, 214, 1)', 'rgba(207, 182, 128, 1)', 'rgba(141, 211, 199, 1)', 'rgba(252, 205, 229, 1)', 'rgba(255, 247, 161, 1)', 'rgba(217, 217, 217, 1)'],
  daysAgo: 20,
  defaults: {
    autocomplete: 'autocomplete',
    chartType: 'Line',
    dateFormat: 'YYYY-MM-DD',
    localizeDateFormat: 'true',
    numericalFormatting: 'true',
    project: 'en.wikipedia.org'
  },
  dateRangeSelector: '.aqs-date-range-selector',
  globalChartOpts: {
    animation: true,
    animationEasing: 'easeInOutQuart',
    animationSteps: 30,
    labelsFilter: function labelsFilter(value, index, labels) {
      if (labels.length >= 60) {
        return (index + 1) % Math.ceil(labels.length / 60 * 2) !== 0;
      } else {
        return false;
      }
    },
    multiTooltipTemplate: '<%= formatNumber(value) %>',
    scaleLabel: '<%= formatNumber(value) %>',
    tooltipTemplate: '<%if (label){%><%=label%>: <%}%><%= formatNumber(value) %>'
  },
  linearCharts: ['Line', 'Bar', 'Radar'],
  minDate: moment('2015-10-01').startOf('day'),
  maxDate: moment().subtract(1, 'days').startOf('day'),
  projectInput: '.aqs-project-input',
  timestampFormat: 'YYYYMMDD00'
};
module.exports = config;

},{"./shared/pv":5,"./templates":7}],2:[function(require,module,exports){
'use strict';

/*
 * Pageviews Analysis tool
 *
 * Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d courtesy of marcelrf
 *
 * Copyright 2016 MusikAnimal
 * Redistributed under the MIT License: https://opensource.org/licenses/MIT
 */

var config = require('./config');
var siteMap = require('./shared/site_map');
var siteDomains = Object.keys(siteMap).map(function (key) {
  return siteMap[key];
});
var pv = require('./shared/pv');
var session = require('./session'),
    colorsStyleEl = undefined;

/** let's us know if the page names have been normalized via the API yet */
var normalized = false;

/**
 * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
 * caused by race conditions between consecutive ajax calls. They are actually
 * not critical and can be avoided with this empty function.
 * @param {Object} data - doesn't matter
 * @returns {null} nothing
 */
function articleSuggestionCallback(data) {}
window.articleSuggestionCallback = articleSuggestionCallback;

/**
 * Destroy previous chart, if needed.
 * @returns {null} nothing
 */
function destroyChart() {
  if (session.chartObj) {
    session.chartObj.destroy();
    delete session.chartObj;
  }
}

/**
 * Exports current chart data to CSV format and loads it in a new tab
 * With the prepended data:text/csv this should cause the browser to download the data
 * @returns {string} CSV content
 */
function exportCSV() {
  var csvContent = 'data:text/csv;charset=utf-8,Date,';
  var titles = [];
  var dataRows = [];
  var dates = getDateHeadings(false);

  // Begin constructing the dataRows array by populating it with the dates
  dates.forEach(function (date, index) {
    dataRows[index] = [date];
  });

  chartData.forEach(function (page) {
    // Build an array of page titles for use in the CSV header
    var pageTitle = '"' + page.label.replace(/"/g, '""') + '"';
    titles.push(pageTitle);

    // Populate the dataRows array with the data for this page
    dates.forEach(function (date, index) {
      dataRows[index].push(page.data[index]);
    });
  });

  // Finish the CSV header
  csvContent = csvContent + titles.join(',') + '\n';

  // Add the rows to the CSV
  dataRows.forEach(function (data) {
    csvContent += data.join(',') + '\n';
  });

  // Output the CSV file to the browser
  var encodedUri = encodeURI(csvContent);
  window.open(encodedUri);
}

/**
 * Exports current chart data to JSON format and loads it in a new tab
 * @returns {string} stringified JSON
 */
function exportJSON() {
  var data = [];

  chartData.forEach(function (page, index) {
    var entry = {
      page: page.label.replace(/"/g, '\"').replace(/'/g, "\'"),
      color: page.strokeColor,
      sum: page.sum,
      daily_average: Math.round(page.sum / numDaysInRange())
    };

    getDateHeadings(false).forEach(function (heading, index) {
      entry[heading.replace(/\\/, '')] = page.data[index];
    });

    data.push(entry);
  });

  var jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(data),
      encodedUri = encodeURI(jsonContent);
  window.open(encodedUri);

  return jsonContent;
}

/**
 * Fill in values within settings modal with what's in the session object
 * @returns {null} nothing
 */
function fillInSettings() {
  $.each($('#settings-modal input'), function () {
    var name = $(this).prop('name');

    if ($(this).prop('type') === 'checkbox') {
      $(this).prop('checked', session[name] === 'true');
    } else {
      $(this).prop('checked', session[name] === $(this).val());
    }
  });
}

/**
 * Fills in zero value to a timeseries, see:
 * https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
 *
 * @param {object} data fetched from API
 * @param {moment} startDate - start date of range to filter through
 * @param {moment} endDate - end date of range
 * @returns {object} dataset with zeros where nulls where
 */
function fillInZeros(data, startDate, endDate) {
  /** Extract the dates that are already in the timeseries */
  var alreadyThere = {};
  data.items.forEach(function (elem) {
    var date = moment(elem.timestamp, config.timestampFormat);
    alreadyThere[date] = elem;
  });
  data.items = [];

  /** Reconstruct with zeros instead of nulls */
  for (var date = moment(startDate); date <= endDate; date.add(1, 'd')) {
    if (alreadyThere[date]) {
      data.items.push(alreadyThere[date]);
    } else {
      var edgeCase = endDate.isSame(config.maxDate) || endDate.isSame(config.maxDate.subtract(1, 'days'));
      data.items.push({
        timestamp: date.format(config.timestampFormat),
        views: edgeCase ? null : 0
      });
    }
  }
}

/**
 * Format number based on current settings, e.g. localize with comma delimeters
 * @param {number|string} num - number to format
 * @returns {string} formatted number
 */
function formatNumber(num) {
  if (session.numericalFormatting === 'true') {
    return pv.n(num);
  } else {
    return num;
  }
}
/** need to export to global for chart templating */
window.formatNumber = formatNumber;

/**
 * Get data formatted for a circular chart (Pie, Doughnut, PolarArea)
 *
 * @param {object} data - data just before we are ready to render the chart
 * @param {string} article - title of page
 * @param {integer} index - where we are in the list of pages to show
 *    used for colour selection
 * @returns {object} - ready for chart rendering
 */
function getCircularData(data, article, index) {
  var values = data.items.map(function (elem) {
    return elem.views;
  }),
      color = config.colors[index];

  return Object.assign({
    label: article.replace(/_/g, ' '),
    value: values.reduce(function (a, b) {
      return a + b;
    })
  }, config.chartConfig[session.chartType].dataset(color));
}

/**
 * Get date format to use based on settings
 * @returns {string} date format to passed to parser
 */
function getDateFormat() {
  if (session.localizeDateFormat === 'true') {
    return pv.getLocaleDateString();
  } else {
    return config.defaults.dateFormat;
  }
}

/**
 * Gets the date headings as strings - i18n compliant
 * @param {boolean} localized - whether the dates should be localized per browser language
 * @returns {Array} the date headings as strings
 */
function getDateHeadings(localized) {
  var daterangepicker = $(config.dateRangeSelector).data('daterangepicker'),
      dateHeadings = [];

  for (var date = moment(daterangepicker.startDate); date.isBefore(daterangepicker.endDate); date.add(1, 'd')) {
    if (localized) {
      dateHeadings.push(date.format(getDateFormat()));
    } else {
      dateHeadings.push(date.format('YYYY-MM-DD'));
    }
  }
  return dateHeadings;
}

/**
 * Get data formatted for a linear chart (Line, Bar, Radar)
 *
 * @param {object} data - data just before we are ready to render the chart
 * @param {string} article - title of page
 * @param {integer} index - where we are in the list of pages to show
 *    used for colour selection
 * @returns {object} - ready for chart rendering
 */
function getLinearData(data, article, index) {
  var values = data.items.map(function (elem) {
    return elem.views;
  }),
      color = config.colors[index % 10];

  return Object.assign({
    label: article.replace(/_/g, ' '),
    data: values,
    sum: values.reduce(function (a, b) {
      return a + b;
    })
  }, config.chartConfig[session.chartType].dataset(color));
}

/**
 * Construct query for API based on what type of search we're doing
 * @param {Object} query - as returned from Select2 input
 * @returns {Object} query params to be handed off to API
 */
function getSearchParams(query) {
  if (session.autocomplete === 'autocomplete') {
    return {
      'action': 'query',
      'list': 'prefixsearch',
      'format': 'json',
      'pssearch': query || '',
      'cirrusUseCompletionSuggester': 'yes'
    };
  } else if (session.autocomplete === 'autocomplete_redirects') {
    return {
      'action': 'opensearch',
      'format': 'json',
      'search': query || '',
      'redirects': 'return'
    };
  }
}

/**
 * Compute how many days are in the selected date range
 *
 * @returns {integer} number of days
 */
function numDaysInRange() {
  var daterangepicker = $(config.dateRangeSelector).data('daterangepicker');
  return daterangepicker.endDate.diff(daterangepicker.startDate, 'days') + 1;
}
/** must be global for use in Chart templates */
window.numDaysInRange = numDaysInRange;

/*
 * Generate key/value pairs of URL hash params
 * @returns {Object} key/value pairs representation of URL hash
 */
function parseHashParams() {
  var uri = decodeURI(location.hash.slice(1)),
      chunks = uri.split('&');
  var params = {};

  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i].split('=');

    if (chunk[0] === 'pages') {
      params.pages = chunk[1].split('|');
    } else {
      params[chunk[0]] = chunk[1];
    }
  }

  return params;
}

/**
 * Parses the URL hash and sets all the inputs accordingly
 * Should only be called on initial page load, until we decide to support pop states (probably never)
 * @returns {null} nothing
 */
function popParams() {
  var params = parseHashParams();

  $(config.projectInput).val(params.project || config.defaults.project);
  if (validateProject()) return;

  var startDate = moment(params.start || moment().subtract(config.daysAgo, 'days')),
      endDate = moment(params.end || Date.now());

  $(config.dateRangeSelector).data('daterangepicker').setStartDate(startDate);
  $(config.dateRangeSelector).data('daterangepicker').setEndDate(endDate);
  $('#platform-select').val(params.platform || 'all-access');
  $('#agent-select').val(params.agent || 'user');

  if (startDate < moment('2015-10-01') || endDate < moment('2015-10-01')) {
    pv.addSiteNotice('danger', i18nMessages.paramError1, i18nMessages.invalidParams, true);
    resetView();
    return;
  } else if (startDate > endDate) {
    pv.addSiteNotice('warning', i18nMessages.paramError2, i18nMessages.invalidParams, true);
    resetView();
    return;
  }

  resetArticleSelector();

  if (!params.pages || params.pages.length === 1 && !params.pages[0]) {
    params.pages = ['Cat', 'Dog'];
    setArticleSelectorDefaults(params.pages);
  } else if (normalized) {
    params.pages = pv.underscorePageNames(params.pages);
    setArticleSelectorDefaults(params.pages);
  } else {
    pv.normalizePageNames(params.pages).then(function (data) {
      normalized = true;

      params.pages = data;

      if (params.pages.length === 1) {
        session.chartType = localStorage['pageviews-chart-preference'] || 'Bar';
      }

      setArticleSelectorDefaults(pv.underscorePageNames(params.pages));
    });
  }
}

/**
 * Processes Mediawiki API results into Select2 format based on settings
 * @param {Object} data - data as received from the API
 * @returns {Object} data ready to handed over to Select2
 */
function processSearchResults(data) {
  var results = [];

  if (session.autocomplete === 'autocomplete') {
    if (data && data.query && data.query.prefixsearch.length) {
      results = data.query.prefixsearch.map(function (elem) {
        return {
          id: elem.title.replace(/ /g, '_'),
          text: elem.title
        };
      });
    }
  } else if (session.autocomplete === 'autocomplete_redirects') {
    if (data && data[1].length) {
      results = data[1].map(function (elem) {
        return {
          id: elem.replace(/ /g, '_'),
          text: elem
        };
      });
    }
  }

  return { results: results };
}

/**
 * Replaces history state with new URL hash representing current user input
 * Called whenever we go to update the chart
 * @returns {string} the new hash param string
 */
function pushParams() {
  var daterangepicker = $(config.dateRangeSelector).data('daterangepicker'),
      pages = $(config.articleSelector).select2('val') || [];

  var state = $.param({
    start: daterangepicker.startDate.format('YYYY-MM-DD'),
    end: daterangepicker.endDate.format('YYYY-MM-DD'),
    project: $(config.projectInput).val(),
    platform: $('#platform-select').val(),
    agent: $('#agent-select').val()
  }) + '&pages=' + pages.join('|');

  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, 'Pageviews comparsion', '#' + state);
  }

  return state;
}

/**
 * Removes all article selector related stuff then adds it back
 * Also calls updateChart
 * @returns {null} nothing
 */
function resetArticleSelector() {
  var articleSelector = $(config.articleSelector);
  articleSelector.off('change');
  articleSelector.select2('val', null);
  articleSelector.select2('data', null);
  articleSelector.select2('destroy');
  $('.data-links').hide();
  setupArticleSelector();
}

/**
 * Removes chart, messages, and resets article selections
 * @returns {null} nothing
 */
function resetView() {
  $('.chart-container').html('');
  $('.chart-container').removeClass('loading');
  $('#chart-legend').html('');
  $('.message-container').html('');
  resetArticleSelector();
}

/**
 * Save a particular setting to session and localStorage
 *
 * @param {string} key - settings key
 * @param {string|boolean} value - value to save
 * @returns {null} nothing
 */
function saveSetting(key, value) {
  session[key] = value;
  localStorage['pageviews-settings-' + key] = value;
}

/**
 * Save the selected settings within the settings modal
 * Prefer this implementation over a large library like serializeObject or serializeJSON
 * @returns {null} nothing
 */
function saveSettings() {
  /** track if we're changing to no_autocomplete mode */
  var wasAutocomplete = session.autocomplete === 'no_autocomplete';

  $.each($('#settings-modal input'), function () {
    if (this.type === 'checkbox') {
      saveSetting(this.name, this.checked ? 'true' : 'false');
    } else if (this.checked) {
      saveSetting(this.name, this.value);
    }
  });

  var daterangepicker = $('.aqs-date-range-selector').data('daterangepicker');
  daterangepicker.locale.format = getDateFormat();
  daterangepicker.updateElement();
  setupSelect2Colors();

  /**
   * If we changed to/from no_autocomplete we have to reset the article selector entirely
   *   as setArticleSelectorDefaults is super buggy due to Select2 constraints
   * So let's only reset if we have to
   */
  if (session.autocomplete === 'no_autocomplete' !== wasAutocomplete) {
    resetArticleSelector();
  }

  updateChart(true);
}

/**
 * Directly set articles in article selector
 * Currently is not able to remove underscore from page names
 *
 * @param {array} pages - page titles
 * @returns {array} - untouched array of pages
 */
function setArticleSelectorDefaults(pages) {
  var articleSelectorQuery = config.articleSelector;
  pages.forEach(function (page) {
    var escapedText = $('<div>').text(page).html();
    $('<option>' + escapedText + '</option>').appendTo(articleSelectorQuery);
  });
  var articleSelector = $(articleSelectorQuery);
  articleSelector.select2('val', pages);
  articleSelector.select2('close');

  return pages;
}

/**
 * Sets up the article selector and adds listener to update chart
 * @returns {null} - nothing
 */
function setupArticleSelector() {
  var articleSelector = $(config.articleSelector);

  var params = {
    ajax: getArticleSelectorAjax(),
    tags: session.autocomplete === 'no_autocomplete',
    placeholder: i18nMessages.articlePlaceholder,
    maximumSelectionLength: 10,
    minimumInputLength: 1
  };

  articleSelector.select2(params);
  articleSelector.on('change', updateChart);
}

function getArticleSelectorAjax() {
  if (session.autocomplete !== 'no_autocomplete') {
    /**
     * This ajax call queries the Mediawiki API for article name
     * suggestions given the search term inputed in the selector.
     * We ultimately want to make the endpoint configurable based on whether they want redirects
     */
    return {
      url: 'https://' + pv.getProject() + '.org/w/api.php',
      dataType: 'jsonp',
      delay: 200,
      jsonpCallback: 'articleSuggestionCallback',
      data: function data(search) {
        return getSearchParams(search.term);
      },
      processResults: processSearchResults,
      cache: true
    };
  } else {
    return null;
  }
}

/**
 * sets up the daterange selector and adds listeners
 * @returns {null} - nothing
 */
function setupDateRangeSelector() {
  var dateRangeSelector = $(config.dateRangeSelector);
  dateRangeSelector.daterangepicker({
    locale: {
      format: getDateFormat(),
      applyLabel: i18nMessages.apply,
      cancelLabel: i18nMessages.cancel,
      daysOfWeek: [i18nMessages.su, i18nMessages.mo, i18nMessages.tu, i18nMessages.we, i18nMessages.th, i18nMessages.fr, i18nMessages.sa],
      monthNames: [i18nMessages.january, i18nMessages.february, i18nMessages.march, i18nMessages.april, i18nMessages.may, i18nMessages.june, i18nMessages.july, i18nMessages.august, i18nMessages.september, i18nMessages.october, i18nMessages.november, i18nMessages.december]
    },
    startDate: moment().subtract(config.daysAgo, 'days'),
    minDate: config.minDate,
    maxDate: config.maxDate
  });

  /** so people know why they can't query data older than October 2015 */
  $('.daterangepicker').append($('<div>').addClass('daterange-notice').html(i18nMessages.dateNotice));

  dateRangeSelector.on('change', function () {
    /** Attempt to fine-tune the pointer detection spacing based on how cluttered the chart is */
    if (session.chartType === 'Line') {
      if (numDaysInRange() > 50) {
        Chart.defaults.Line.pointHitDetectionRadius = 3;
      } else if (numDaysInRange() > 30) {
        Chart.defaults.Line.pointHitDetectionRadius = 5;
      } else if (numDaysInRange() > 20) {
        Chart.defaults.Line.pointHitDetectionRadius = 10;
      } else {
        Chart.defaults.Line.pointHitDetectionRadius = 20;
      }
    }

    updateChart();
  });
}

/**
 * General place to add page-wide listeners
 * @returns {null} - nothing
 */
function setupListeners() {
  $('.download-csv').on('click', exportCSV);
  $('.download-json').on('click', exportJSON);
  $('#platform-select, #agent-select').on('change', updateChart);

  /** changing of chart types */
  $('.modal-chart-type a').on('click', function () {
    session.chartType = $(this).data('type');
    localStorage['pageviews-chart-preference'] = session.chartType;
    updateChart();
  });

  /** the "Latest N days" links */
  $('.date-latest a').on('click', function () {
    var daterangepicker = $(config.dateRangeSelector).data('daterangepicker');
    daterangepicker.setStartDate(moment().subtract($(this).data('value'), 'days'));
    daterangepicker.setEndDate(moment());
  });

  /** prevent browser's default behaviour for any link with href="#" */
  $('a[href=\'#\'').on('click', function (e) {
    return e.preventDefault();
  });

  // window.onpopstate = popParams();
}

/**
 * Setup listeners for project input
 * @returns {null} - nothing
 */
function setupProjectInput() {
  $(config.projectInput).on('change', function () {
    if (!this.value) {
      this.value = config.defaults.project;
      return;
    }
    if (validateProject()) return;
    resetView();
  });
}

/**
 * Setup colors for Select2 entries so we can dynamically change them
 * This is a necessary evil, as we have to mark them as !important
 *   and since there are any number of entires, we need to use nth-child selectors
 * @returns {CSSStylesheet} our new stylesheet
 */
function setupSelect2Colors() {
  /** first delete old stylesheet, if present */
  if (colorsStyleEl) colorsStyleEl.remove();

  /** create new stylesheet */
  colorsStyleEl = document.createElement('style');
  colorsStyleEl.appendChild(document.createTextNode('')); // WebKit hack :(
  document.head.appendChild(colorsStyleEl);

  /** add color rules */
  config.colors.forEach(function (color, index) {
    colorsStyleEl.sheet.insertRule('.select2-selection__choice:nth-of-type(' + (index + 1) + ') { background: ' + color + ' !important }', 0);
  });

  return colorsStyleEl.sheet;
}

/**
 * Set values of form based on localStorage or defaults, add listeners
 * @returns {null} nothing
 */
function setupSettingsModal() {
  /** fill in values, everything is either a checkbox or radio */
  fillInSettings();

  /** add listener */
  $('.save-settings-btn').on('click', saveSettings);
  $('.cancel-settings-btn').on('click', fillInSettings);
}

/**
 * The mother of all functions, where all the chart logic lives
 * Really needs to be broken out into several functions
 *
 * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
 * @returns {null} - nothin
 */
function updateChart(force) {
  var articles = $(config.articleSelector).select2('val') || [];

  pushParams();

  /** prevent duplicate querying due to conflicting listeners */
  if (!force && location.hash === session.params && session.prevChartType === session.chartType) {
    return;
  }

  if (!articles.length) {
    resetView();
    return;
  }

  session.params = location.hash;
  session.prevChartType = session.chartType;

  /** Collect parameters from inputs. */
  var dateRangeSelector = $(config.dateRangeSelector),
      startDate = dateRangeSelector.data('daterangepicker').startDate.startOf('day'),
      endDate = dateRangeSelector.data('daterangepicker').endDate.startOf('day');

  destroyChart();
  $('.message-container').html('');
  $('.chart-container').addClass('loading');

  /**
   * Asynchronously collect the data from Analytics Query Service API,
   * process it to Chart.js format and initialize the chart.
   */
  var labels = []; // Labels (dates) for the x-axis.
  var datasets = []; // Data for each article timeseries.
  articles.forEach(function (article, index) {
    var uriEncodedArticle = encodeURIComponent(article);
    /** Url to query the API. */
    var url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' + pv.getProject() + ('/' + $('#platform-select').val() + '/' + $('#agent-select').val() + '/' + uriEncodedArticle + '/daily') + ('/' + startDate.format(config.timestampFormat) + '/' + endDate.format(config.timestampFormat));

    $.ajax({
      url: url,
      dataType: 'json'
    }).success(function (data) {
      fillInZeros(data, startDate, endDate);

      /** Build the article's dataset. */
      if (config.linearCharts.includes(session.chartType)) {
        datasets.push(getLinearData(data, article, index));
      } else {
        datasets.push(getCircularData(data, article, index));
      }

      window.chartData = datasets;
    }).fail(function (data) {
      if (data.status === 404) {
        writeMessage('No data found for the page <a href=\'' + pv.getPageURL(article) + '\'>' + article + '</a>', true);
        articles = articles.filter(function (el) {
          return el !== article;
        });

        if (!articles.length) {
          $('.chart-container').html('');
          $('.chart-container').removeClass('loading');
        }
      }
    }).always(function (data) {
      /** Get the labels from the first call. */
      if (labels.length === 0 && data.items) {
        labels = data.items.map(function (elem) {
          return moment(elem.timestamp, config.timestampFormat).format(getDateFormat());
        });
      }

      /** When all article datasets have been collected, initialize the chart. */
      if (articles.length && datasets.length === articles.length) {
        $('.chart-container').removeClass('loading');
        var options = Object.assign({}, config.chartConfig[session.chartType].opts, config.globalChartOpts);
        var linearData = { labels: labels, datasets: datasets };

        $('.chart-container').html('');
        $('.chart-container').append("<canvas class='aqs-chart'>");
        var context = $(config.chart)[0].getContext('2d');

        if (config.linearCharts.includes(session.chartType)) {
          session.chartObj = new Chart(context)[session.chartType](linearData, options);
        } else {
          session.chartObj = new Chart(context)[session.chartType](datasets, options);
        }

        $('#chart-legend').html(session.chartObj.generateLegend());
        $('.data-links').show();
      }
    });
  });
}

/**
 * Checks value of project input and validates it against site map
 * @returns {boolean} whether the currently input project is valid
 */
function validateProject() {
  var project = $(config.projectInput).val();
  if (siteDomains.includes(project)) {
    $('.validate').remove();
    $('.select2-selection--multiple').removeClass('disabled');
  } else {
    resetView();
    writeMessage('<a href=\'//' + project + '\'>' + project + '</a> is not a\n       <a href=\'//meta.wikipedia.org/w/api.php?action=sitematrix&formatversion=2\'>valid project</a>\n       validate', true);
    $('.select2-selection--multiple').addClass('disabled');
    return true;
  }
}

/**
 * Writes message just below the chart
 * @param {string} message - message to write
 * @param {boolean} clear - whether to clear any existing messages
 * @returns {jQuery} - jQuery object of message container
 */
function writeMessage(message, clear) {
  if (clear) {
    pv.clearMessages();
  }
  return $('.message-container').append('<div class=\'error-message\'>' + message + '</div>');
}

$(document).ready(function () {
  $.extend(Chart.defaults.global, { animation: false, responsive: true });

  setupProjectInput();
  setupDateRangeSelector();
  setupArticleSelector();
  setupSettingsModal();
  setupSelect2Colors();
  popParams();

  /** simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :) */
  $.ajax({
    url: '//tools.wmflabs.org/musikanimal/api/uses',
    method: 'PATCH',
    data: {
      tool: 'pageviews',
      type: 'form'
    }
  });

  /** temporary redirect notice from when tool was moved from /musikanimal/pageviews to /pageviews */
  if (document.location.search.includes('redirected=true')) {
    if (window.history && window.history.replaceState) {
      var newURL = document.location.href.replace(document.location.search, '');
      window.history.replaceState({}, 'Pageviews comparsion', newURL);
    }
    pv.addSiteNotice('info', 'Please update your links to point to\n       <a class=\'alert-link\' href=\'//tools.wmflabs.org/pageviews\'>tools.wmflabs.org/pageviews</a>', 'Pageviews Analysis has moved!');
  }

  setupListeners();

  pv.splash();
});

},{"./config":1,"./session":3,"./shared/pv":5,"./shared/site_map":6}],3:[function(require,module,exports){
'use strict';

var config = require('./config');

var session = {
  autocomplete: localStorage['pageviews-settings-autocomplete'] || config.defaults.autocomplete,
  chartObj: null,
  chartType: localStorage['pageviews-chart-preference'] || config.defaults.chartType,
  localizeDateFormat: localStorage['pageviews-settings-localizeDateFormat'] || config.defaults.localizeDateFormat,
  numericalFormatting: localStorage['pageviews-settings-numericalFormatting'] || config.defaults.numericalFormatting,
  params: null,
  prevChartType: null
};

module.exports = session;

},{"./config":1}],4:[function(require,module,exports){
'use strict';

// Array.includes function polyfill
// This is not a full implementation, just a shorthand to indexOf !== -1
if (!Array.prototype.includes) {
  Array.prototype.includes = function (search) {
    return this.indexOf(search) !== -1;
  };
}

// String.includes function polyfill
if (!String.prototype.includes) {
  String.prototype.includes = function (search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }

    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// Object.assign
if (typeof Object.assign !== 'function') {
  (function () {
    Object.assign = function (target) {
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}

// ChildNode.remove
if (!('remove' in Element.prototype)) {
  Element.prototype.remove = function () {
    this.parentNode.removeChild(this);
  };
}

},{}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var pv = {
  addSiteNotice: function addSiteNotice(level, message, title, autodismiss) {
    title = title ? '<strong>' + title + '</strong> ' : '';
    autodismiss = autodismiss ? ' autodismiss' : '';
    $('.site-notice').append('<div class=\'alert alert-' + level + autodismiss + '\'>' + title + message + '</div>');
    $('.site-notice-wrapper').show();
  },
  clearMessages: function clearMessages() {
    $('.message-container').html('');
  },
  clearSiteNotices: function clearSiteNotices() {
    $('.site-notice .autodismiss').remove();

    if (!$('.site-notice .alert').length) {
      $('.site-notice-wrapper').hide();
    }
  },


  /**
   * Get the wiki URL given the page name
   *
   * @param {string} page name
   * @returns {string} URL for the page
   */
  getPageURL: function getPageURL(page) {
    return '//' + pv.getProject() + '.org/wiki/' + encodeURIComponent(page).replace(/ /g, '_').replace(/'/, escape);
  },


  /**
   * Get the project name (without the .org)
   *
   * @returns {boolean} lang.projectname
   */
  getProject: function getProject() {
    var project = $('.aqs-project-input').val();
    // Get the first 2 characters from the project code to get the language
    return project.replace(/.org$/, '');
  },
  getLocaleDateString: function getLocaleDateString() {
    var formats = {
      'ar-SA': 'DD/MM/YY',
      'bg-BG': 'DD.M.YYYY',
      'ca-ES': 'DD/MM/YYYY',
      'zh-TW': 'YYYY/M/d',
      'cs-CZ': 'D.M.YYYY',
      'da-DK': 'DD-MM-YYYY',
      'de-DE': 'DD.MM.YYYY',
      'el-GR': 'D/M/YYYY',
      'en-US': 'M/D/YYYY',
      'fi-FI': 'D.M.YYYY',
      'fr-FR': 'DD/MM/YYYY',
      'he-IL': 'DD/MM/YYYY',
      'hu-HU': 'YYYY. MM. DD.',
      'is-IS': 'D.M.YYYY',
      'it-IT': 'DD/MM/YYYY',
      'ja-JP': 'YYYY/MM/DD',
      'ko-KR': 'YYYY-MM-DD',
      'nl-NL': 'D-M-YYYY',
      'nb-NO': 'DD.MM.YYYY',
      'pl-PL': 'YYYY-MM-DD',
      'pt-BR': 'D/M/YYYY',
      'ro-RO': 'DD.MM.YYYY',
      'ru-RU': 'DD.MM.YYYY',
      'hr-HR': 'D.M.YYYY',
      'sk-SK': 'D. M. YYYY',
      'sq-AL': 'YYYY-MM-DD',
      'sv-SE': 'YYYY-MM-DD',
      'th-TH': 'D/M/YYYY',
      'tr-TR': 'DD.MM.YYYY',
      'ur-PK': 'DD/MM/YYYY',
      'id-ID': 'DD/MM/YYYY',
      'uk-UA': 'DD.MM.YYYY',
      'be-BY': 'DD.MM.YYYY',
      'sl-SI': 'D.M.YYYY',
      'et-EE': 'D.MM.YYYY',
      'lv-LV': 'YYYY.MM.DD.',
      'lt-LT': 'YYYY.MM.DD',
      'fa-IR': 'MM/DD/YYYY',
      'vi-VN': 'DD/MM/YYYY',
      'hy-AM': 'DD.MM.YYYY',
      'az-Latn-AZ': 'DD.MM.YYYY',
      'eu-ES': 'YYYY/MM/DD',
      'mk-MK': 'DD.MM.YYYY',
      'af-ZA': 'YYYY/MM/DD',
      'ka-GE': 'DD.MM.YYYY',
      'fo-FO': 'DD-MM-YYYY',
      'hi-IN': 'DD-MM-YYYY',
      'ms-MY': 'DD/MM/YYYY',
      'kk-KZ': 'DD.MM.YYYY',
      'ky-KG': 'DD.MM.YY',
      'sw-KE': 'M/d/YYYY',
      'uz-Latn-UZ': 'DD/MM YYYY',
      'tt-RU': 'DD.MM.YYYY',
      'pa-IN': 'DD-MM-YY',
      'gu-IN': 'DD-MM-YY',
      'ta-IN': 'DD-MM-YYYY',
      'te-IN': 'DD-MM-YY',
      'kn-IN': 'DD-MM-YY',
      'mr-IN': 'DD-MM-YYYY',
      'sa-IN': 'DD-MM-YYYY',
      'mn-MN': 'YY.MM.DD',
      'gl-ES': 'DD/MM/YY',
      'kok-IN': 'DD-MM-YYYY',
      'syr-SY': 'DD/MM/YYYY',
      'dv-MV': 'DD/MM/YY',
      'ar-IQ': 'DD/MM/YYYY',
      'zh-CN': 'YYYY/M/D',
      'de-CH': 'DD.MM.YYYY',
      'en-GB': 'DD/MM/YYYY',
      'es-MX': 'DD/MM/YYYY',
      'fr-BE': 'D/MM/YYYY',
      'it-CH': 'DD.MM.YYYY',
      'nl-BE': 'D/MM/YYYY',
      'nn-NO': 'DD.MM.YYYY',
      'pt-PT': 'DD-MM-YYYY',
      'sr-Latn-CS': 'D.M.YYYY',
      'sv-FI': 'D.M.YYYY',
      'az-Cyrl-AZ': 'DD.MM.YYYY',
      'ms-BN': 'DD/MM/YYYY',
      'uz-Cyrl-UZ': 'DD.MM.YYYY',
      'ar-EG': 'DD/MM/YYYY',
      'zh-HK': 'D/M/YYYY',
      'de-AT': 'DD.MM.YYYY',
      'en-AU': 'D/MM/YYYY',
      'es-ES': 'DD/MM/YYYY',
      'fr-CA': 'YYYY-MM-DD',
      'sr-Cyrl-CS': 'D.M.YYYY',
      'ar-LY': 'DD/MM/YYYY',
      'zh-SG': 'D/M/YYYY',
      'de-LU': 'DD.MM.YYYY',
      'en-CA': 'DD/MM/YYYY',
      'es-GT': 'DD/MM/YYYY',
      'fr-CH': 'DD.MM.YYYY',
      'ar-DZ': 'DD-MM-YYYY',
      'zh-MO': 'D/M/YYYY',
      'de-LI': 'DD.MM.YYYY',
      'en-NZ': 'D/MM/YYYY',
      'es-CR': 'DD/MM/YYYY',
      'fr-LU': 'DD/MM/YYYY',
      'ar-MA': 'DD-MM-YYYY',
      'en-IE': 'DD/MM/YYYY',
      'es-PA': 'MM/DD/YYYY',
      'fr-MC': 'DD/MM/YYYY',
      'ar-TN': 'DD-MM-YYYY',
      'en-ZA': 'YYYY/MM/DD',
      'es-DO': 'DD/MM/YYYY',
      'ar-OM': 'DD/MM/YYYY',
      'en-JM': 'DD/MM/YYYY',
      'es-VE': 'DD/MM/YYYY',
      'ar-YE': 'DD/MM/YYYY',
      'en-029': 'MM/DD/YYYY',
      'es-CO': 'DD/MM/YYYY',
      'ar-SY': 'DD/MM/YYYY',
      'en-BZ': 'DD/MM/YYYY',
      'es-PE': 'DD/MM/YYYY',
      'ar-JO': 'DD/MM/YYYY',
      'en-TT': 'DD/MM/YYYY',
      'es-AR': 'DD/MM/YYYY',
      'ar-LB': 'DD/MM/YYYY',
      'en-ZW': 'M/D/YYYY',
      'es-EC': 'DD/MM/YYYY',
      'ar-KW': 'DD/MM/YYYY',
      'en-PH': 'M/D/YYYY',
      'es-CL': 'DD-MM-YYYY',
      'ar-AE': 'DD/MM/YYYY',
      'es-UY': 'DD/MM/YYYY',
      'ar-BH': 'DD/MM/YYYY',
      'es-PY': 'DD/MM/YYYY',
      'ar-QA': 'DD/MM/YYYY',
      'es-BO': 'DD/MM/YYYY',
      'es-SV': 'DD/MM/YYYY',
      'es-HN': 'DD/MM/YYYY',
      'es-NI': 'DD/MM/YYYY',
      'es-PR': 'DD/MM/YYYY',
      'am-ET': 'D/M/YYYY',
      'tzm-Latn-DZ': 'DD-MM-YYYY',
      'iu-Latn-CA': 'D/MM/YYYY',
      'sma-NO': 'DD.MM.YYYY',
      'mn-Mong-CN': 'YYYY/M/d',
      'gd-GB': 'DD/MM/YYYY',
      'en-MY': 'D/M/YYYY',
      'prs-AF': 'DD/MM/YY',
      'bn-BD': 'DD-MM-YY',
      'wo-SN': 'DD/MM/YYYY',
      'rw-RW': 'M/D/YYYY',
      'qut-GT': 'DD/MM/YYYY',
      'sah-RU': 'MM.DD.YYYY',
      'gsw-FR': 'DD/MM/YYYY',
      'co-FR': 'DD/MM/YYYY',
      'oc-FR': 'DD/MM/YYYY',
      'mi-NZ': 'DD/MM/YYYY',
      'ga-IE': 'DD/MM/YYYY',
      'se-SE': 'YYYY-MM-DD',
      'br-FR': 'DD/MM/YYYY',
      'smn-FI': 'D.M.YYYY',
      'moh-CA': 'M/D/YYYY',
      'arn-CL': 'DD-MM-YYYY',
      'ii-CN': 'YYYY/M/D',
      'dsb-DE': 'D. M. YYYY',
      'ig-NG': 'D/M/YYYY',
      'kl-GL': 'DD-MM-YYYY',
      'lb-LU': 'DD/MM/YYYY',
      'ba-RU': 'DD.MM.YY',
      'nso-ZA': 'YYYY/MM/DD',
      'quz-BO': 'DD/MM/YYYY',
      'yo-NG': 'D/M/YYYY',
      'ha-Latn-NG': 'D/M/YYYY',
      'fil-PH': 'M/D/YYYY',
      'ps-AF': 'DD/MM/YY',
      'fy-NL': 'D-M-YYYY',
      'ne-NP': 'M/D/YYYY',
      'se-NO': 'DD.MM.YYYY',
      'iu-Cans-CA': 'D/M/YYYY',
      'sr-Latn-RS': 'D.M.YYYY',
      'si-LK': 'YYYY-MM-DD',
      'sr-Cyrl-RS': 'D.M.YYYY',
      'lo-LA': 'DD/MM/YYYY',
      'km-KH': 'YYYY-MM-DD',
      'cy-GB': 'DD/MM/YYYY',
      'bo-CN': 'YYYY/M/D',
      'sms-FI': 'D.M.YYYY',
      'as-IN': 'DD-MM-YYYY',
      'ml-IN': 'DD-MM-YY',
      'en-IN': 'DD-MM-YYYY',
      'or-IN': 'DD-MM-YY',
      'bn-IN': 'DD-MM-YY',
      'tk-TM': 'DD.MM.YY',
      'bs-Latn-BA': 'D.M.YYYY',
      'mt-MT': 'DD/MM/YYYY',
      'sr-Cyrl-ME': 'D.M.YYYY',
      'se-FI': 'D.M.YYYY',
      'zu-ZA': 'YYYY/MM/DD',
      'xh-ZA': 'YYYY/MM/DD',
      'tn-ZA': 'YYYY/MM/DD',
      'hsb-DE': 'D. M. YYYY',
      'bs-Cyrl-BA': 'D.M.YYYY',
      'tg-Cyrl-TJ': 'DD.MM.yy',
      'sr-Latn-BA': 'D.M.YYYY',
      'smj-NO': 'DD.MM.YYYY',
      'rm-CH': 'DD/MM/YYYY',
      'smj-SE': 'YYYY-MM-DD',
      'quz-EC': 'DD/MM/YYYY',
      'quz-PE': 'DD/MM/YYYY',
      'hr-BA': 'D.M.YYYY.',
      'sr-Latn-ME': 'D.M.YYYY',
      'sma-SE': 'YYYY-MM-DD',
      'en-SG': 'D/M/YYYY',
      'ug-CN': 'YYYY-M-D',
      'sr-Cyrl-BA': 'D.M.YYYY',
      'es-US': 'M/D/YYYY'
    };
    return formats[navigator.language] || 'YYYY-MM-DD';
  },


  /**
   * Check if Intl is supported
   *
   * @returns {boolean} whether the browser (presumably) supports date locale operations
   */
  localeSupported: function localeSupported() {
    return (typeof Intl === 'undefined' ? 'undefined' : _typeof(Intl)) === 'object';
  },


  /**
   * Map normalized pages from API into a string of page names
   * Used in normalizePageNames()
   *
   * @param {array} pages - array of page names
   * @param {array} normalizedPages - array of normalized mappings returned by the API
   * @returns {array} pages with the new normalized names, if given
   */
  mapNormalizedPageNames: function mapNormalizedPageNames(pages, normalizedPages) {
    normalizedPages.forEach(function (normalPage) {
      /** do it this way to preserve ordering of pages */
      pages = pages.map(function (page) {
        if (normalPage.from === page) {
          return normalPage.to;
        } else {
          return page;
        }
      });
    });
    return pages;
  },


  /**
   * Localize Number object with delimiters
   *
   * @param {Number} value - the Number, e.g. 1234567
   * @returns {string} - with locale delimiters, e.g. 1,234,567 (en-US)
   */
  n: function n(value) {
    return new Number(value).toLocaleString();
  },


  /**
   * Make request to API in order to get normalized page names. E.g. masculine versus feminine namespaces on dewiki
   *
   * @param {array} pages - array of page names
   * @returns {Deferred} promise with data fetched from API
   */
  normalizePageNames: function normalizePageNames(pages) {
    var _this = this;

    var dfd = $.Deferred();

    return $.ajax({
      url: 'https://' + pv.getProject() + '.org/w/api.php?action=query&prop=info&format=json&titles=' + pages.join('|'),
      dataType: 'jsonp'
    }).then(function (data) {
      if (data.query.normalized) {
        pages = _this.mapNormalizedPageNames(pages, data.query.normalized);
      }
      return dfd.resolve(pages);
    });
  },


  /**
   * Change alpha level of an rgba value
   *
   * @param {string} value - rgba value
   * @param {float|string} alpha - transparency as float value
   * @returns {string} rgba value
   */
  rgba: function rgba(value, alpha) {
    return value.replace(/,\s*\d\)/, ', ' + alpha + ')');
  },


  /**
   * Splash in console, just for fun
   * @returns {String} output
   */
  splash: function splash() {
    console.log('      ___            __ _                     _                             ');
    console.log('     | _ \\  __ _    / _` |   ___    __ __    (_)     ___   __ __ __  ___    ');
    console.log('     |  _/ / _` |   \\__, |  / -_)   \\ V /    | |    / -_)  \\ V  V / (_-<    ');
    console.log('    _|_|_  \\__,_|   |___/   \\___|   _\\_/_   _|_|_   \\___|   \\_/\\_/  /__/_   ');
    console.log('  _| """ |_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|  ');
    console.log('  "`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'  ');
    console.log('              ___                     _  _     _               _            ');
    console.log('      o O O  /   \\   _ _     __ _    | || |   | |     ___     (_)     ___   ');
    console.log('     o       | - |  | \' \\   / _` |    \\_, |   | |    (_-<     | |    (_-<   ');
    console.log('    TS__[O]  |_|_|  |_||_|  \\__,_|   _|__/   _|_|_   /__/_   _|_|_   /__/_  ');
    console.log('   {======|_|"""""|_|"""""|_|"""""|_| """"|_|"""""|_|"""""|_|"""""|_|"""""| ');
    console.log('  ./o--000\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\' ');
  },


  /**
   * Replace spaces with underscores
   *
   * @param {array} pages - array of page names
   * @returns {array} page names with underscores
   */
  underscorePageNames: function underscorePageNames(pages) {
    return pages.map(function (page) {
      return decodeURIComponent(page.replace(/ /g, '_'));
    });
  }
};

// must be exported to global scope for Chart template rendering
window.pv = pv;

module.exports = pv;

},{}],6:[function(require,module,exports){
'use strict';

var siteMap = {
  'aawiki': 'aa.wikipedia.org',
  'aawiktionary': 'aa.wiktionary.org',
  'aawikibooks': 'aa.wikibooks.org',
  'abwiki': 'ab.wikipedia.org',
  'abwiktionary': 'ab.wiktionary.org',
  'acewiki': 'ace.wikipedia.org',
  'afwiki': 'af.wikipedia.org',
  'afwiktionary': 'af.wiktionary.org',
  'afwikibooks': 'af.wikibooks.org',
  'afwikiquote': 'af.wikiquote.org',
  'akwiki': 'ak.wikipedia.org',
  'akwiktionary': 'ak.wiktionary.org',
  'akwikibooks': 'ak.wikibooks.org',
  'alswiki': 'als.wikipedia.org',
  'alswiktionary': 'als.wiktionary.org',
  'alswikibooks': 'als.wikibooks.org',
  'alswikiquote': 'als.wikiquote.org',
  'amwiki': 'am.wikipedia.org',
  'amwiktionary': 'am.wiktionary.org',
  'amwikiquote': 'am.wikiquote.org',
  'anwiki': 'an.wikipedia.org',
  'anwiktionary': 'an.wiktionary.org',
  'angwiki': 'ang.wikipedia.org',
  'angwiktionary': 'ang.wiktionary.org',
  'angwikibooks': 'ang.wikibooks.org',
  'angwikiquote': 'ang.wikiquote.org',
  'angwikisource': 'ang.wikisource.org',
  'arwiki': 'ar.wikipedia.org',
  'arwiktionary': 'ar.wiktionary.org',
  'arwikibooks': 'ar.wikibooks.org',
  'arwikinews': 'ar.wikinews.org',
  'arwikiquote': 'ar.wikiquote.org',
  'arwikisource': 'ar.wikisource.org',
  'arwikiversity': 'ar.wikiversity.org',
  'arcwiki': 'arc.wikipedia.org',
  'arzwiki': 'arz.wikipedia.org',
  'aswiki': 'as.wikipedia.org',
  'aswiktionary': 'as.wiktionary.org',
  'aswikibooks': 'as.wikibooks.org',
  'aswikisource': 'as.wikisource.org',
  'astwiki': 'ast.wikipedia.org',
  'astwiktionary': 'ast.wiktionary.org',
  'astwikibooks': 'ast.wikibooks.org',
  'astwikiquote': 'ast.wikiquote.org',
  'avwiki': 'av.wikipedia.org',
  'avwiktionary': 'av.wiktionary.org',
  'aywiki': 'ay.wikipedia.org',
  'aywiktionary': 'ay.wiktionary.org',
  'aywikibooks': 'ay.wikibooks.org',
  'azwiki': 'az.wikipedia.org',
  'azwiktionary': 'az.wiktionary.org',
  'azwikibooks': 'az.wikibooks.org',
  'azwikiquote': 'az.wikiquote.org',
  'azwikisource': 'az.wikisource.org',
  'azbwiki': 'azb.wikipedia.org',
  'bawiki': 'ba.wikipedia.org',
  'bawikibooks': 'ba.wikibooks.org',
  'barwiki': 'bar.wikipedia.org',
  'bat_smgwiki': 'bat-smg.wikipedia.org',
  'bclwiki': 'bcl.wikipedia.org',
  'bewiki': 'be.wikipedia.org',
  'bewiktionary': 'be.wiktionary.org',
  'bewikibooks': 'be.wikibooks.org',
  'bewikiquote': 'be.wikiquote.org',
  'bewikisource': 'be.wikisource.org',
  'be_x_oldwiki': 'be-tarask.wikipedia.org',
  'bgwiki': 'bg.wikipedia.org',
  'bgwiktionary': 'bg.wiktionary.org',
  'bgwikibooks': 'bg.wikibooks.org',
  'bgwikinews': 'bg.wikinews.org',
  'bgwikiquote': 'bg.wikiquote.org',
  'bgwikisource': 'bg.wikisource.org',
  'bhwiki': 'bh.wikipedia.org',
  'bhwiktionary': 'bh.wiktionary.org',
  'biwiki': 'bi.wikipedia.org',
  'biwiktionary': 'bi.wiktionary.org',
  'biwikibooks': 'bi.wikibooks.org',
  'bjnwiki': 'bjn.wikipedia.org',
  'bmwiki': 'bm.wikipedia.org',
  'bmwiktionary': 'bm.wiktionary.org',
  'bmwikibooks': 'bm.wikibooks.org',
  'bmwikiquote': 'bm.wikiquote.org',
  'bnwiki': 'bn.wikipedia.org',
  'bnwiktionary': 'bn.wiktionary.org',
  'bnwikibooks': 'bn.wikibooks.org',
  'bnwikisource': 'bn.wikisource.org',
  'bowiki': 'bo.wikipedia.org',
  'bowiktionary': 'bo.wiktionary.org',
  'bowikibooks': 'bo.wikibooks.org',
  'bpywiki': 'bpy.wikipedia.org',
  'brwiki': 'br.wikipedia.org',
  'brwiktionary': 'br.wiktionary.org',
  'brwikiquote': 'br.wikiquote.org',
  'brwikisource': 'br.wikisource.org',
  'bswiki': 'bs.wikipedia.org',
  'bswiktionary': 'bs.wiktionary.org',
  'bswikibooks': 'bs.wikibooks.org',
  'bswikinews': 'bs.wikinews.org',
  'bswikiquote': 'bs.wikiquote.org',
  'bswikisource': 'bs.wikisource.org',
  'bugwiki': 'bug.wikipedia.org',
  'bxrwiki': 'bxr.wikipedia.org',
  'cawiki': 'ca.wikipedia.org',
  'cawiktionary': 'ca.wiktionary.org',
  'cawikibooks': 'ca.wikibooks.org',
  'cawikinews': 'ca.wikinews.org',
  'cawikiquote': 'ca.wikiquote.org',
  'cawikisource': 'ca.wikisource.org',
  'cbk_zamwiki': 'cbk-zam.wikipedia.org',
  'cdowiki': 'cdo.wikipedia.org',
  'cewiki': 'ce.wikipedia.org',
  'cebwiki': 'ceb.wikipedia.org',
  'chwiki': 'ch.wikipedia.org',
  'chwiktionary': 'ch.wiktionary.org',
  'chwikibooks': 'ch.wikibooks.org',
  'chowiki': 'cho.wikipedia.org',
  'chrwiki': 'chr.wikipedia.org',
  'chrwiktionary': 'chr.wiktionary.org',
  'chywiki': 'chy.wikipedia.org',
  'ckbwiki': 'ckb.wikipedia.org',
  'cowiki': 'co.wikipedia.org',
  'cowiktionary': 'co.wiktionary.org',
  'cowikibooks': 'co.wikibooks.org',
  'cowikiquote': 'co.wikiquote.org',
  'crwiki': 'cr.wikipedia.org',
  'crwiktionary': 'cr.wiktionary.org',
  'crwikiquote': 'cr.wikiquote.org',
  'crhwiki': 'crh.wikipedia.org',
  'cswiki': 'cs.wikipedia.org',
  'cswiktionary': 'cs.wiktionary.org',
  'cswikibooks': 'cs.wikibooks.org',
  'cswikinews': 'cs.wikinews.org',
  'cswikiquote': 'cs.wikiquote.org',
  'cswikisource': 'cs.wikisource.org',
  'cswikiversity': 'cs.wikiversity.org',
  'csbwiki': 'csb.wikipedia.org',
  'csbwiktionary': 'csb.wiktionary.org',
  'cuwiki': 'cu.wikipedia.org',
  'cvwiki': 'cv.wikipedia.org',
  'cvwikibooks': 'cv.wikibooks.org',
  'cywiki': 'cy.wikipedia.org',
  'cywiktionary': 'cy.wiktionary.org',
  'cywikibooks': 'cy.wikibooks.org',
  'cywikiquote': 'cy.wikiquote.org',
  'cywikisource': 'cy.wikisource.org',
  'dawiki': 'da.wikipedia.org',
  'dawiktionary': 'da.wiktionary.org',
  'dawikibooks': 'da.wikibooks.org',
  'dawikiquote': 'da.wikiquote.org',
  'dawikisource': 'da.wikisource.org',
  'dewiki': 'de.wikipedia.org',
  'dewiktionary': 'de.wiktionary.org',
  'dewikibooks': 'de.wikibooks.org',
  'dewikinews': 'de.wikinews.org',
  'dewikiquote': 'de.wikiquote.org',
  'dewikisource': 'de.wikisource.org',
  'dewikiversity': 'de.wikiversity.org',
  'dewikivoyage': 'de.wikivoyage.org',
  'diqwiki': 'diq.wikipedia.org',
  'dsbwiki': 'dsb.wikipedia.org',
  'dvwiki': 'dv.wikipedia.org',
  'dvwiktionary': 'dv.wiktionary.org',
  'dzwiki': 'dz.wikipedia.org',
  'dzwiktionary': 'dz.wiktionary.org',
  'eewiki': 'ee.wikipedia.org',
  'elwiki': 'el.wikipedia.org',
  'elwiktionary': 'el.wiktionary.org',
  'elwikibooks': 'el.wikibooks.org',
  'elwikinews': 'el.wikinews.org',
  'elwikiquote': 'el.wikiquote.org',
  'elwikisource': 'el.wikisource.org',
  'elwikiversity': 'el.wikiversity.org',
  'elwikivoyage': 'el.wikivoyage.org',
  'emlwiki': 'eml.wikipedia.org',
  'enwiki': 'en.wikipedia.org',
  'enwiktionary': 'en.wiktionary.org',
  'enwikibooks': 'en.wikibooks.org',
  'enwikinews': 'en.wikinews.org',
  'enwikiquote': 'en.wikiquote.org',
  'enwikisource': 'en.wikisource.org',
  'enwikiversity': 'en.wikiversity.org',
  'enwikivoyage': 'en.wikivoyage.org',
  'eowiki': 'eo.wikipedia.org',
  'eowiktionary': 'eo.wiktionary.org',
  'eowikibooks': 'eo.wikibooks.org',
  'eowikinews': 'eo.wikinews.org',
  'eowikiquote': 'eo.wikiquote.org',
  'eowikisource': 'eo.wikisource.org',
  'eswiki': 'es.wikipedia.org',
  'eswiktionary': 'es.wiktionary.org',
  'eswikibooks': 'es.wikibooks.org',
  'eswikinews': 'es.wikinews.org',
  'eswikiquote': 'es.wikiquote.org',
  'eswikisource': 'es.wikisource.org',
  'eswikiversity': 'es.wikiversity.org',
  'eswikivoyage': 'es.wikivoyage.org',
  'etwiki': 'et.wikipedia.org',
  'etwiktionary': 'et.wiktionary.org',
  'etwikibooks': 'et.wikibooks.org',
  'etwikiquote': 'et.wikiquote.org',
  'etwikisource': 'et.wikisource.org',
  'euwiki': 'eu.wikipedia.org',
  'euwiktionary': 'eu.wiktionary.org',
  'euwikibooks': 'eu.wikibooks.org',
  'euwikiquote': 'eu.wikiquote.org',
  'extwiki': 'ext.wikipedia.org',
  'fawiki': 'fa.wikipedia.org',
  'fawiktionary': 'fa.wiktionary.org',
  'fawikibooks': 'fa.wikibooks.org',
  'fawikinews': 'fa.wikinews.org',
  'fawikiquote': 'fa.wikiquote.org',
  'fawikisource': 'fa.wikisource.org',
  'fawikivoyage': 'fa.wikivoyage.org',
  'ffwiki': 'ff.wikipedia.org',
  'fiwiki': 'fi.wikipedia.org',
  'fiwiktionary': 'fi.wiktionary.org',
  'fiwikibooks': 'fi.wikibooks.org',
  'fiwikinews': 'fi.wikinews.org',
  'fiwikiquote': 'fi.wikiquote.org',
  'fiwikisource': 'fi.wikisource.org',
  'fiwikiversity': 'fi.wikiversity.org',
  'fiu_vrowiki': 'fiu-vro.wikipedia.org',
  'fjwiki': 'fj.wikipedia.org',
  'fjwiktionary': 'fj.wiktionary.org',
  'fowiki': 'fo.wikipedia.org',
  'fowiktionary': 'fo.wiktionary.org',
  'fowikisource': 'fo.wikisource.org',
  'frwiki': 'fr.wikipedia.org',
  'frwiktionary': 'fr.wiktionary.org',
  'frwikibooks': 'fr.wikibooks.org',
  'frwikinews': 'fr.wikinews.org',
  'frwikiquote': 'fr.wikiquote.org',
  'frwikisource': 'fr.wikisource.org',
  'frwikiversity': 'fr.wikiversity.org',
  'frwikivoyage': 'fr.wikivoyage.org',
  'frpwiki': 'frp.wikipedia.org',
  'frrwiki': 'frr.wikipedia.org',
  'furwiki': 'fur.wikipedia.org',
  'fywiki': 'fy.wikipedia.org',
  'fywiktionary': 'fy.wiktionary.org',
  'fywikibooks': 'fy.wikibooks.org',
  'gawiki': 'ga.wikipedia.org',
  'gawiktionary': 'ga.wiktionary.org',
  'gawikibooks': 'ga.wikibooks.org',
  'gawikiquote': 'ga.wikiquote.org',
  'gagwiki': 'gag.wikipedia.org',
  'ganwiki': 'gan.wikipedia.org',
  'gdwiki': 'gd.wikipedia.org',
  'gdwiktionary': 'gd.wiktionary.org',
  'glwiki': 'gl.wikipedia.org',
  'glwiktionary': 'gl.wiktionary.org',
  'glwikibooks': 'gl.wikibooks.org',
  'glwikiquote': 'gl.wikiquote.org',
  'glwikisource': 'gl.wikisource.org',
  'glkwiki': 'glk.wikipedia.org',
  'gnwiki': 'gn.wikipedia.org',
  'gnwiktionary': 'gn.wiktionary.org',
  'gnwikibooks': 'gn.wikibooks.org',
  'gomwiki': 'gom.wikipedia.org',
  'gotwiki': 'got.wikipedia.org',
  'gotwikibooks': 'got.wikibooks.org',
  'guwiki': 'gu.wikipedia.org',
  'guwiktionary': 'gu.wiktionary.org',
  'guwikibooks': 'gu.wikibooks.org',
  'guwikiquote': 'gu.wikiquote.org',
  'guwikisource': 'gu.wikisource.org',
  'gvwiki': 'gv.wikipedia.org',
  'gvwiktionary': 'gv.wiktionary.org',
  'hawiki': 'ha.wikipedia.org',
  'hawiktionary': 'ha.wiktionary.org',
  'hakwiki': 'hak.wikipedia.org',
  'hawwiki': 'haw.wikipedia.org',
  'hewiki': 'he.wikipedia.org',
  'hewiktionary': 'he.wiktionary.org',
  'hewikibooks': 'he.wikibooks.org',
  'hewikinews': 'he.wikinews.org',
  'hewikiquote': 'he.wikiquote.org',
  'hewikisource': 'he.wikisource.org',
  'hewikivoyage': 'he.wikivoyage.org',
  'hiwiki': 'hi.wikipedia.org',
  'hiwiktionary': 'hi.wiktionary.org',
  'hiwikibooks': 'hi.wikibooks.org',
  'hiwikiquote': 'hi.wikiquote.org',
  'hifwiki': 'hif.wikipedia.org',
  'howiki': 'ho.wikipedia.org',
  'hrwiki': 'hr.wikipedia.org',
  'hrwiktionary': 'hr.wiktionary.org',
  'hrwikibooks': 'hr.wikibooks.org',
  'hrwikiquote': 'hr.wikiquote.org',
  'hrwikisource': 'hr.wikisource.org',
  'hsbwiki': 'hsb.wikipedia.org',
  'hsbwiktionary': 'hsb.wiktionary.org',
  'htwiki': 'ht.wikipedia.org',
  'htwikisource': 'ht.wikisource.org',
  'huwiki': 'hu.wikipedia.org',
  'huwiktionary': 'hu.wiktionary.org',
  'huwikibooks': 'hu.wikibooks.org',
  'huwikinews': 'hu.wikinews.org',
  'huwikiquote': 'hu.wikiquote.org',
  'huwikisource': 'hu.wikisource.org',
  'hywiki': 'hy.wikipedia.org',
  'hywiktionary': 'hy.wiktionary.org',
  'hywikibooks': 'hy.wikibooks.org',
  'hywikiquote': 'hy.wikiquote.org',
  'hywikisource': 'hy.wikisource.org',
  'hzwiki': 'hz.wikipedia.org',
  'iawiki': 'ia.wikipedia.org',
  'iawiktionary': 'ia.wiktionary.org',
  'iawikibooks': 'ia.wikibooks.org',
  'idwiki': 'id.wikipedia.org',
  'idwiktionary': 'id.wiktionary.org',
  'idwikibooks': 'id.wikibooks.org',
  'idwikiquote': 'id.wikiquote.org',
  'idwikisource': 'id.wikisource.org',
  'iewiki': 'ie.wikipedia.org',
  'iewiktionary': 'ie.wiktionary.org',
  'iewikibooks': 'ie.wikibooks.org',
  'igwiki': 'ig.wikipedia.org',
  'iiwiki': 'ii.wikipedia.org',
  'ikwiki': 'ik.wikipedia.org',
  'ikwiktionary': 'ik.wiktionary.org',
  'ilowiki': 'ilo.wikipedia.org',
  'iowiki': 'io.wikipedia.org',
  'iowiktionary': 'io.wiktionary.org',
  'iswiki': 'is.wikipedia.org',
  'iswiktionary': 'is.wiktionary.org',
  'iswikibooks': 'is.wikibooks.org',
  'iswikiquote': 'is.wikiquote.org',
  'iswikisource': 'is.wikisource.org',
  'itwiki': 'it.wikipedia.org',
  'itwiktionary': 'it.wiktionary.org',
  'itwikibooks': 'it.wikibooks.org',
  'itwikinews': 'it.wikinews.org',
  'itwikiquote': 'it.wikiquote.org',
  'itwikisource': 'it.wikisource.org',
  'itwikiversity': 'it.wikiversity.org',
  'itwikivoyage': 'it.wikivoyage.org',
  'iuwiki': 'iu.wikipedia.org',
  'iuwiktionary': 'iu.wiktionary.org',
  'jawiki': 'ja.wikipedia.org',
  'jawiktionary': 'ja.wiktionary.org',
  'jawikibooks': 'ja.wikibooks.org',
  'jawikinews': 'ja.wikinews.org',
  'jawikiquote': 'ja.wikiquote.org',
  'jawikisource': 'ja.wikisource.org',
  'jawikiversity': 'ja.wikiversity.org',
  'jbowiki': 'jbo.wikipedia.org',
  'jbowiktionary': 'jbo.wiktionary.org',
  'jvwiki': 'jv.wikipedia.org',
  'jvwiktionary': 'jv.wiktionary.org',
  'kawiki': 'ka.wikipedia.org',
  'kawiktionary': 'ka.wiktionary.org',
  'kawikibooks': 'ka.wikibooks.org',
  'kawikiquote': 'ka.wikiquote.org',
  'kaawiki': 'kaa.wikipedia.org',
  'kabwiki': 'kab.wikipedia.org',
  'kbdwiki': 'kbd.wikipedia.org',
  'kgwiki': 'kg.wikipedia.org',
  'kiwiki': 'ki.wikipedia.org',
  'kjwiki': 'kj.wikipedia.org',
  'kkwiki': 'kk.wikipedia.org',
  'kkwiktionary': 'kk.wiktionary.org',
  'kkwikibooks': 'kk.wikibooks.org',
  'kkwikiquote': 'kk.wikiquote.org',
  'klwiki': 'kl.wikipedia.org',
  'klwiktionary': 'kl.wiktionary.org',
  'kmwiki': 'km.wikipedia.org',
  'kmwiktionary': 'km.wiktionary.org',
  'kmwikibooks': 'km.wikibooks.org',
  'knwiki': 'kn.wikipedia.org',
  'knwiktionary': 'kn.wiktionary.org',
  'knwikibooks': 'kn.wikibooks.org',
  'knwikiquote': 'kn.wikiquote.org',
  'knwikisource': 'kn.wikisource.org',
  'kowiki': 'ko.wikipedia.org',
  'kowiktionary': 'ko.wiktionary.org',
  'kowikibooks': 'ko.wikibooks.org',
  'kowikinews': 'ko.wikinews.org',
  'kowikiquote': 'ko.wikiquote.org',
  'kowikisource': 'ko.wikisource.org',
  'kowikiversity': 'ko.wikiversity.org',
  'koiwiki': 'koi.wikipedia.org',
  'krwiki': 'kr.wikipedia.org',
  'krwikiquote': 'kr.wikiquote.org',
  'krcwiki': 'krc.wikipedia.org',
  'kswiki': 'ks.wikipedia.org',
  'kswiktionary': 'ks.wiktionary.org',
  'kswikibooks': 'ks.wikibooks.org',
  'kswikiquote': 'ks.wikiquote.org',
  'kshwiki': 'ksh.wikipedia.org',
  'kuwiki': 'ku.wikipedia.org',
  'kuwiktionary': 'ku.wiktionary.org',
  'kuwikibooks': 'ku.wikibooks.org',
  'kuwikiquote': 'ku.wikiquote.org',
  'kvwiki': 'kv.wikipedia.org',
  'kwwiki': 'kw.wikipedia.org',
  'kwwiktionary': 'kw.wiktionary.org',
  'kwwikiquote': 'kw.wikiquote.org',
  'kywiki': 'ky.wikipedia.org',
  'kywiktionary': 'ky.wiktionary.org',
  'kywikibooks': 'ky.wikibooks.org',
  'kywikiquote': 'ky.wikiquote.org',
  'lawiki': 'la.wikipedia.org',
  'lawiktionary': 'la.wiktionary.org',
  'lawikibooks': 'la.wikibooks.org',
  'lawikiquote': 'la.wikiquote.org',
  'lawikisource': 'la.wikisource.org',
  'ladwiki': 'lad.wikipedia.org',
  'lbwiki': 'lb.wikipedia.org',
  'lbwiktionary': 'lb.wiktionary.org',
  'lbwikibooks': 'lb.wikibooks.org',
  'lbwikiquote': 'lb.wikiquote.org',
  'lbewiki': 'lbe.wikipedia.org',
  'lezwiki': 'lez.wikipedia.org',
  'lgwiki': 'lg.wikipedia.org',
  'liwiki': 'li.wikipedia.org',
  'liwiktionary': 'li.wiktionary.org',
  'liwikibooks': 'li.wikibooks.org',
  'liwikiquote': 'li.wikiquote.org',
  'liwikisource': 'li.wikisource.org',
  'lijwiki': 'lij.wikipedia.org',
  'lmowiki': 'lmo.wikipedia.org',
  'lnwiki': 'ln.wikipedia.org',
  'lnwiktionary': 'ln.wiktionary.org',
  'lnwikibooks': 'ln.wikibooks.org',
  'lowiki': 'lo.wikipedia.org',
  'lowiktionary': 'lo.wiktionary.org',
  'lrcwiki': 'lrc.wikipedia.org',
  'ltwiki': 'lt.wikipedia.org',
  'ltwiktionary': 'lt.wiktionary.org',
  'ltwikibooks': 'lt.wikibooks.org',
  'ltwikiquote': 'lt.wikiquote.org',
  'ltwikisource': 'lt.wikisource.org',
  'ltgwiki': 'ltg.wikipedia.org',
  'lvwiki': 'lv.wikipedia.org',
  'lvwiktionary': 'lv.wiktionary.org',
  'lvwikibooks': 'lv.wikibooks.org',
  'maiwiki': 'mai.wikipedia.org',
  'map_bmswiki': 'map-bms.wikipedia.org',
  'mdfwiki': 'mdf.wikipedia.org',
  'mgwiki': 'mg.wikipedia.org',
  'mgwiktionary': 'mg.wiktionary.org',
  'mgwikibooks': 'mg.wikibooks.org',
  'mhwiki': 'mh.wikipedia.org',
  'mhwiktionary': 'mh.wiktionary.org',
  'mhrwiki': 'mhr.wikipedia.org',
  'miwiki': 'mi.wikipedia.org',
  'miwiktionary': 'mi.wiktionary.org',
  'miwikibooks': 'mi.wikibooks.org',
  'minwiki': 'min.wikipedia.org',
  'mkwiki': 'mk.wikipedia.org',
  'mkwiktionary': 'mk.wiktionary.org',
  'mkwikibooks': 'mk.wikibooks.org',
  'mkwikisource': 'mk.wikisource.org',
  'mlwiki': 'ml.wikipedia.org',
  'mlwiktionary': 'ml.wiktionary.org',
  'mlwikibooks': 'ml.wikibooks.org',
  'mlwikiquote': 'ml.wikiquote.org',
  'mlwikisource': 'ml.wikisource.org',
  'mnwiki': 'mn.wikipedia.org',
  'mnwiktionary': 'mn.wiktionary.org',
  'mnwikibooks': 'mn.wikibooks.org',
  'mowiki': 'mo.wikipedia.org',
  'mowiktionary': 'mo.wiktionary.org',
  'mrwiki': 'mr.wikipedia.org',
  'mrwiktionary': 'mr.wiktionary.org',
  'mrwikibooks': 'mr.wikibooks.org',
  'mrwikiquote': 'mr.wikiquote.org',
  'mrwikisource': 'mr.wikisource.org',
  'mrjwiki': 'mrj.wikipedia.org',
  'mswiki': 'ms.wikipedia.org',
  'mswiktionary': 'ms.wiktionary.org',
  'mswikibooks': 'ms.wikibooks.org',
  'mtwiki': 'mt.wikipedia.org',
  'mtwiktionary': 'mt.wiktionary.org',
  'muswiki': 'mus.wikipedia.org',
  'mwlwiki': 'mwl.wikipedia.org',
  'mywiki': 'my.wikipedia.org',
  'mywiktionary': 'my.wiktionary.org',
  'mywikibooks': 'my.wikibooks.org',
  'myvwiki': 'myv.wikipedia.org',
  'mznwiki': 'mzn.wikipedia.org',
  'nawiki': 'na.wikipedia.org',
  'nawiktionary': 'na.wiktionary.org',
  'nawikibooks': 'na.wikibooks.org',
  'nawikiquote': 'na.wikiquote.org',
  'nahwiki': 'nah.wikipedia.org',
  'nahwiktionary': 'nah.wiktionary.org',
  'nahwikibooks': 'nah.wikibooks.org',
  'napwiki': 'nap.wikipedia.org',
  'ndswiki': 'nds.wikipedia.org',
  'ndswiktionary': 'nds.wiktionary.org',
  'ndswikibooks': 'nds.wikibooks.org',
  'ndswikiquote': 'nds.wikiquote.org',
  'nds_nlwiki': 'nds-nl.wikipedia.org',
  'newiki': 'ne.wikipedia.org',
  'newiktionary': 'ne.wiktionary.org',
  'newikibooks': 'ne.wikibooks.org',
  'newwiki': 'new.wikipedia.org',
  'ngwiki': 'ng.wikipedia.org',
  'nlwiki': 'nl.wikipedia.org',
  'nlwiktionary': 'nl.wiktionary.org',
  'nlwikibooks': 'nl.wikibooks.org',
  'nlwikinews': 'nl.wikinews.org',
  'nlwikiquote': 'nl.wikiquote.org',
  'nlwikisource': 'nl.wikisource.org',
  'nlwikivoyage': 'nl.wikivoyage.org',
  'nnwiki': 'nn.wikipedia.org',
  'nnwiktionary': 'nn.wiktionary.org',
  'nnwikiquote': 'nn.wikiquote.org',
  'nowiki': 'no.wikipedia.org',
  'nowiktionary': 'no.wiktionary.org',
  'nowikibooks': 'no.wikibooks.org',
  'nowikinews': 'no.wikinews.org',
  'nowikiquote': 'no.wikiquote.org',
  'nowikisource': 'no.wikisource.org',
  'novwiki': 'nov.wikipedia.org',
  'nrmwiki': 'nrm.wikipedia.org',
  'nsowiki': 'nso.wikipedia.org',
  'nvwiki': 'nv.wikipedia.org',
  'nywiki': 'ny.wikipedia.org',
  'ocwiki': 'oc.wikipedia.org',
  'ocwiktionary': 'oc.wiktionary.org',
  'ocwikibooks': 'oc.wikibooks.org',
  'omwiki': 'om.wikipedia.org',
  'omwiktionary': 'om.wiktionary.org',
  'orwiki': 'or.wikipedia.org',
  'orwiktionary': 'or.wiktionary.org',
  'orwikisource': 'or.wikisource.org',
  'oswiki': 'os.wikipedia.org',
  'pawiki': 'pa.wikipedia.org',
  'pawiktionary': 'pa.wiktionary.org',
  'pawikibooks': 'pa.wikibooks.org',
  'pagwiki': 'pag.wikipedia.org',
  'pamwiki': 'pam.wikipedia.org',
  'papwiki': 'pap.wikipedia.org',
  'pcdwiki': 'pcd.wikipedia.org',
  'pdcwiki': 'pdc.wikipedia.org',
  'pflwiki': 'pfl.wikipedia.org',
  'piwiki': 'pi.wikipedia.org',
  'piwiktionary': 'pi.wiktionary.org',
  'pihwiki': 'pih.wikipedia.org',
  'plwiki': 'pl.wikipedia.org',
  'plwiktionary': 'pl.wiktionary.org',
  'plwikibooks': 'pl.wikibooks.org',
  'plwikinews': 'pl.wikinews.org',
  'plwikiquote': 'pl.wikiquote.org',
  'plwikisource': 'pl.wikisource.org',
  'plwikivoyage': 'pl.wikivoyage.org',
  'pmswiki': 'pms.wikipedia.org',
  'pnbwiki': 'pnb.wikipedia.org',
  'pnbwiktionary': 'pnb.wiktionary.org',
  'pntwiki': 'pnt.wikipedia.org',
  'pswiki': 'ps.wikipedia.org',
  'pswiktionary': 'ps.wiktionary.org',
  'pswikibooks': 'ps.wikibooks.org',
  'ptwiki': 'pt.wikipedia.org',
  'ptwiktionary': 'pt.wiktionary.org',
  'ptwikibooks': 'pt.wikibooks.org',
  'ptwikinews': 'pt.wikinews.org',
  'ptwikiquote': 'pt.wikiquote.org',
  'ptwikisource': 'pt.wikisource.org',
  'ptwikiversity': 'pt.wikiversity.org',
  'ptwikivoyage': 'pt.wikivoyage.org',
  'quwiki': 'qu.wikipedia.org',
  'quwiktionary': 'qu.wiktionary.org',
  'quwikibooks': 'qu.wikibooks.org',
  'quwikiquote': 'qu.wikiquote.org',
  'rmwiki': 'rm.wikipedia.org',
  'rmwiktionary': 'rm.wiktionary.org',
  'rmwikibooks': 'rm.wikibooks.org',
  'rmywiki': 'rmy.wikipedia.org',
  'rnwiki': 'rn.wikipedia.org',
  'rnwiktionary': 'rn.wiktionary.org',
  'rowiki': 'ro.wikipedia.org',
  'rowiktionary': 'ro.wiktionary.org',
  'rowikibooks': 'ro.wikibooks.org',
  'rowikinews': 'ro.wikinews.org',
  'rowikiquote': 'ro.wikiquote.org',
  'rowikisource': 'ro.wikisource.org',
  'rowikivoyage': 'ro.wikivoyage.org',
  'roa_rupwiki': 'roa-rup.wikipedia.org',
  'roa_rupwiktionary': 'roa-rup.wiktionary.org',
  'roa_tarawiki': 'roa-tara.wikipedia.org',
  'ruwiki': 'ru.wikipedia.org',
  'ruwiktionary': 'ru.wiktionary.org',
  'ruwikibooks': 'ru.wikibooks.org',
  'ruwikinews': 'ru.wikinews.org',
  'ruwikiquote': 'ru.wikiquote.org',
  'ruwikisource': 'ru.wikisource.org',
  'ruwikiversity': 'ru.wikiversity.org',
  'ruwikivoyage': 'ru.wikivoyage.org',
  'ruewiki': 'rue.wikipedia.org',
  'rwwiki': 'rw.wikipedia.org',
  'rwwiktionary': 'rw.wiktionary.org',
  'sawiki': 'sa.wikipedia.org',
  'sawiktionary': 'sa.wiktionary.org',
  'sawikibooks': 'sa.wikibooks.org',
  'sawikiquote': 'sa.wikiquote.org',
  'sawikisource': 'sa.wikisource.org',
  'sahwiki': 'sah.wikipedia.org',
  'sahwikisource': 'sah.wikisource.org',
  'scwiki': 'sc.wikipedia.org',
  'scwiktionary': 'sc.wiktionary.org',
  'scnwiki': 'scn.wikipedia.org',
  'scnwiktionary': 'scn.wiktionary.org',
  'scowiki': 'sco.wikipedia.org',
  'sdwiki': 'sd.wikipedia.org',
  'sdwiktionary': 'sd.wiktionary.org',
  'sdwikinews': 'sd.wikinews.org',
  'sewiki': 'se.wikipedia.org',
  'sewikibooks': 'se.wikibooks.org',
  'sgwiki': 'sg.wikipedia.org',
  'sgwiktionary': 'sg.wiktionary.org',
  'shwiki': 'sh.wikipedia.org',
  'shwiktionary': 'sh.wiktionary.org',
  'siwiki': 'si.wikipedia.org',
  'siwiktionary': 'si.wiktionary.org',
  'siwikibooks': 'si.wikibooks.org',
  'simplewiki': 'simple.wikipedia.org',
  'simplewiktionary': 'simple.wiktionary.org',
  'simplewikibooks': 'simple.wikibooks.org',
  'simplewikiquote': 'simple.wikiquote.org',
  'skwiki': 'sk.wikipedia.org',
  'skwiktionary': 'sk.wiktionary.org',
  'skwikibooks': 'sk.wikibooks.org',
  'skwikiquote': 'sk.wikiquote.org',
  'skwikisource': 'sk.wikisource.org',
  'slwiki': 'sl.wikipedia.org',
  'slwiktionary': 'sl.wiktionary.org',
  'slwikibooks': 'sl.wikibooks.org',
  'slwikiquote': 'sl.wikiquote.org',
  'slwikisource': 'sl.wikisource.org',
  'slwikiversity': 'sl.wikiversity.org',
  'smwiki': 'sm.wikipedia.org',
  'smwiktionary': 'sm.wiktionary.org',
  'snwiki': 'sn.wikipedia.org',
  'snwiktionary': 'sn.wiktionary.org',
  'sowiki': 'so.wikipedia.org',
  'sowiktionary': 'so.wiktionary.org',
  'sqwiki': 'sq.wikipedia.org',
  'sqwiktionary': 'sq.wiktionary.org',
  'sqwikibooks': 'sq.wikibooks.org',
  'sqwikinews': 'sq.wikinews.org',
  'sqwikiquote': 'sq.wikiquote.org',
  'srwiki': 'sr.wikipedia.org',
  'srwiktionary': 'sr.wiktionary.org',
  'srwikibooks': 'sr.wikibooks.org',
  'srwikinews': 'sr.wikinews.org',
  'srwikiquote': 'sr.wikiquote.org',
  'srwikisource': 'sr.wikisource.org',
  'srnwiki': 'srn.wikipedia.org',
  'sswiki': 'ss.wikipedia.org',
  'sswiktionary': 'ss.wiktionary.org',
  'stwiki': 'st.wikipedia.org',
  'stwiktionary': 'st.wiktionary.org',
  'stqwiki': 'stq.wikipedia.org',
  'suwiki': 'su.wikipedia.org',
  'suwiktionary': 'su.wiktionary.org',
  'suwikibooks': 'su.wikibooks.org',
  'suwikiquote': 'su.wikiquote.org',
  'svwiki': 'sv.wikipedia.org',
  'svwiktionary': 'sv.wiktionary.org',
  'svwikibooks': 'sv.wikibooks.org',
  'svwikinews': 'sv.wikinews.org',
  'svwikiquote': 'sv.wikiquote.org',
  'svwikisource': 'sv.wikisource.org',
  'svwikiversity': 'sv.wikiversity.org',
  'svwikivoyage': 'sv.wikivoyage.org',
  'swwiki': 'sw.wikipedia.org',
  'swwiktionary': 'sw.wiktionary.org',
  'swwikibooks': 'sw.wikibooks.org',
  'szlwiki': 'szl.wikipedia.org',
  'tawiki': 'ta.wikipedia.org',
  'tawiktionary': 'ta.wiktionary.org',
  'tawikibooks': 'ta.wikibooks.org',
  'tawikinews': 'ta.wikinews.org',
  'tawikiquote': 'ta.wikiquote.org',
  'tawikisource': 'ta.wikisource.org',
  'tewiki': 'te.wikipedia.org',
  'tewiktionary': 'te.wiktionary.org',
  'tewikibooks': 'te.wikibooks.org',
  'tewikiquote': 'te.wikiquote.org',
  'tewikisource': 'te.wikisource.org',
  'tetwiki': 'tet.wikipedia.org',
  'tgwiki': 'tg.wikipedia.org',
  'tgwiktionary': 'tg.wiktionary.org',
  'tgwikibooks': 'tg.wikibooks.org',
  'thwiki': 'th.wikipedia.org',
  'thwiktionary': 'th.wiktionary.org',
  'thwikibooks': 'th.wikibooks.org',
  'thwikinews': 'th.wikinews.org',
  'thwikiquote': 'th.wikiquote.org',
  'thwikisource': 'th.wikisource.org',
  'tiwiki': 'ti.wikipedia.org',
  'tiwiktionary': 'ti.wiktionary.org',
  'tkwiki': 'tk.wikipedia.org',
  'tkwiktionary': 'tk.wiktionary.org',
  'tkwikibooks': 'tk.wikibooks.org',
  'tkwikiquote': 'tk.wikiquote.org',
  'tlwiki': 'tl.wikipedia.org',
  'tlwiktionary': 'tl.wiktionary.org',
  'tlwikibooks': 'tl.wikibooks.org',
  'tnwiki': 'tn.wikipedia.org',
  'tnwiktionary': 'tn.wiktionary.org',
  'towiki': 'to.wikipedia.org',
  'towiktionary': 'to.wiktionary.org',
  'tpiwiki': 'tpi.wikipedia.org',
  'tpiwiktionary': 'tpi.wiktionary.org',
  'trwiki': 'tr.wikipedia.org',
  'trwiktionary': 'tr.wiktionary.org',
  'trwikibooks': 'tr.wikibooks.org',
  'trwikinews': 'tr.wikinews.org',
  'trwikiquote': 'tr.wikiquote.org',
  'trwikisource': 'tr.wikisource.org',
  'tswiki': 'ts.wikipedia.org',
  'tswiktionary': 'ts.wiktionary.org',
  'ttwiki': 'tt.wikipedia.org',
  'ttwiktionary': 'tt.wiktionary.org',
  'ttwikibooks': 'tt.wikibooks.org',
  'ttwikiquote': 'tt.wikiquote.org',
  'tumwiki': 'tum.wikipedia.org',
  'twwiki': 'tw.wikipedia.org',
  'twwiktionary': 'tw.wiktionary.org',
  'tywiki': 'ty.wikipedia.org',
  'tyvwiki': 'tyv.wikipedia.org',
  'udmwiki': 'udm.wikipedia.org',
  'ugwiki': 'ug.wikipedia.org',
  'ugwiktionary': 'ug.wiktionary.org',
  'ugwikibooks': 'ug.wikibooks.org',
  'ugwikiquote': 'ug.wikiquote.org',
  'ukwiki': 'uk.wikipedia.org',
  'ukwiktionary': 'uk.wiktionary.org',
  'ukwikibooks': 'uk.wikibooks.org',
  'ukwikinews': 'uk.wikinews.org',
  'ukwikiquote': 'uk.wikiquote.org',
  'ukwikisource': 'uk.wikisource.org',
  'ukwikivoyage': 'uk.wikivoyage.org',
  'urwiki': 'ur.wikipedia.org',
  'urwiktionary': 'ur.wiktionary.org',
  'urwikibooks': 'ur.wikibooks.org',
  'urwikiquote': 'ur.wikiquote.org',
  'uzwiki': 'uz.wikipedia.org',
  'uzwiktionary': 'uz.wiktionary.org',
  'uzwikibooks': 'uz.wikibooks.org',
  'uzwikiquote': 'uz.wikiquote.org',
  'vewiki': 've.wikipedia.org',
  'vecwiki': 'vec.wikipedia.org',
  'vecwiktionary': 'vec.wiktionary.org',
  'vecwikisource': 'vec.wikisource.org',
  'vepwiki': 'vep.wikipedia.org',
  'viwiki': 'vi.wikipedia.org',
  'viwiktionary': 'vi.wiktionary.org',
  'viwikibooks': 'vi.wikibooks.org',
  'viwikiquote': 'vi.wikiquote.org',
  'viwikisource': 'vi.wikisource.org',
  'viwikivoyage': 'vi.wikivoyage.org',
  'vlswiki': 'vls.wikipedia.org',
  'vowiki': 'vo.wikipedia.org',
  'vowiktionary': 'vo.wiktionary.org',
  'vowikibooks': 'vo.wikibooks.org',
  'vowikiquote': 'vo.wikiquote.org',
  'wawiki': 'wa.wikipedia.org',
  'wawiktionary': 'wa.wiktionary.org',
  'wawikibooks': 'wa.wikibooks.org',
  'warwiki': 'war.wikipedia.org',
  'wowiki': 'wo.wikipedia.org',
  'wowiktionary': 'wo.wiktionary.org',
  'wowikiquote': 'wo.wikiquote.org',
  'wuuwiki': 'wuu.wikipedia.org',
  'xalwiki': 'xal.wikipedia.org',
  'xhwiki': 'xh.wikipedia.org',
  'xhwiktionary': 'xh.wiktionary.org',
  'xhwikibooks': 'xh.wikibooks.org',
  'xmfwiki': 'xmf.wikipedia.org',
  'yiwiki': 'yi.wikipedia.org',
  'yiwiktionary': 'yi.wiktionary.org',
  'yiwikisource': 'yi.wikisource.org',
  'yowiki': 'yo.wikipedia.org',
  'yowiktionary': 'yo.wiktionary.org',
  'yowikibooks': 'yo.wikibooks.org',
  'zawiki': 'za.wikipedia.org',
  'zawiktionary': 'za.wiktionary.org',
  'zawikibooks': 'za.wikibooks.org',
  'zawikiquote': 'za.wikiquote.org',
  'zeawiki': 'zea.wikipedia.org',
  'zhwiki': 'zh.wikipedia.org',
  'zhwiktionary': 'zh.wiktionary.org',
  'zhwikibooks': 'zh.wikibooks.org',
  'zhwikinews': 'zh.wikinews.org',
  'zhwikiquote': 'zh.wikiquote.org',
  'zhwikisource': 'zh.wikisource.org',
  'zhwikivoyage': 'zh.wikivoyage.org',
  'zh_classicalwiki': 'zh-classical.wikipedia.org',
  'zh_min_nanwiki': 'zh-min-nan.wikipedia.org',
  'zh_min_nanwiktionary': 'zh-min-nan.wiktionary.org',
  'zh_min_nanwikibooks': 'zh-min-nan.wikibooks.org',
  'zh_min_nanwikiquote': 'zh-min-nan.wikiquote.org',
  'zh_min_nanwikisource': 'zh-min-nan.wikisource.org',
  'zh_yuewiki': 'zh-yue.wikipedia.org',
  'zuwiki': 'zu.wikipedia.org',
  'zuwiktionary': 'zu.wiktionary.org',
  'zuwikibooks': 'zu.wikibooks.org',
  'advisorywiki': 'advisory.wikimedia.org',
  'arwikimedia': 'ar.wikimedia.org',
  'arbcom_dewiki': 'arbcom-de.wikipedia.org',
  'arbcom_enwiki': 'arbcom-en.wikipedia.org',
  'arbcom_fiwiki': 'arbcom-fi.wikipedia.org',
  'arbcom_nlwiki': 'arbcom-nl.wikipedia.org',
  'auditcomwiki': 'auditcom.wikimedia.org',
  'bdwikimedia': 'bd.wikimedia.org',
  'bewikimedia': 'be.wikimedia.org',
  'betawikiversity': 'beta.wikiversity.org',
  'boardwiki': 'board.wikimedia.org',
  'boardgovcomwiki': 'boardgovcom.wikimedia.org',
  'brwikimedia': 'br.wikimedia.org',
  'cawikimedia': 'ca.wikimedia.org',
  'chairwiki': 'chair.wikimedia.org',
  'chapcomwiki': 'affcom.wikimedia.org',
  'checkuserwiki': 'checkuser.wikimedia.org',
  'cnwikimedia': 'cn.wikimedia.org',
  'cowikimedia': 'co.wikimedia.org',
  'collabwiki': 'collab.wikimedia.org',
  'commonswiki': 'commons.wikimedia.org',
  'dkwikimedia': 'dk.wikimedia.org',
  'donatewiki': 'donate.wikimedia.org',
  'etwikimedia': 'ee.wikimedia.org',
  'execwiki': 'exec.wikimedia.org',
  'fdcwiki': 'fdc.wikimedia.org',
  'fiwikimedia': 'fi.wikimedia.org',
  'foundationwiki': 'wikimediafoundation.org',
  'grantswiki': 'grants.wikimedia.org',
  'iegcomwiki': 'iegcom.wikimedia.org',
  'ilwikimedia': 'il.wikimedia.org',
  'incubatorwiki': 'incubator.wikimedia.org',
  'internalwiki': 'internal.wikimedia.org',
  'labswiki': 'wikitech.wikimedia.org',
  'labtestwiki': 'labtestwikitech.wikimedia.org',
  'legalteamwiki': 'legalteam.wikimedia.org',
  'loginwiki': 'login.wikimedia.org',
  'mediawikiwiki': 'www.mediawiki.org',
  'metawiki': 'meta.wikimedia.org',
  'mkwikimedia': 'mk.wikimedia.org',
  'movementroleswiki': 'movementroles.wikimedia.org',
  'mxwikimedia': 'mx.wikimedia.org',
  'nlwikimedia': 'nl.wikimedia.org',
  'nowikimedia': 'no.wikimedia.org',
  'noboard_chapterswikimedia': 'noboard-chapters.wikimedia.org',
  'nostalgiawiki': 'nostalgia.wikipedia.org',
  'nycwikimedia': 'nyc.wikimedia.org',
  'nzwikimedia': 'nz.wikimedia.org',
  'officewiki': 'office.wikimedia.org',
  'ombudsmenwiki': 'ombudsmen.wikimedia.org',
  'otrs_wikiwiki': 'otrs-wiki.wikimedia.org',
  'outreachwiki': 'outreach.wikimedia.org',
  'pa_uswikimedia': 'pa-us.wikimedia.org',
  'plwikimedia': 'pl.wikimedia.org',
  'qualitywiki': 'quality.wikimedia.org',
  'rswikimedia': 'rs.wikimedia.org',
  'ruwikimedia': 'ru.wikimedia.org',
  'sewikimedia': 'se.wikimedia.org',
  'searchcomwiki': 'searchcom.wikimedia.org',
  'sourceswiki': 'wikisource.org',
  'spcomwiki': 'spcom.wikimedia.org',
  'specieswiki': 'species.wikimedia.org',
  'stewardwiki': 'steward.wikimedia.org',
  'strategywiki': 'strategy.wikimedia.org',
  'tenwiki': 'ten.wikipedia.org',
  'testwiki': 'test.wikipedia.org',
  'test2wiki': 'test2.wikipedia.org',
  'testwikidatawiki': 'test.wikidata.org',
  'trwikimedia': 'tr.wikimedia.org',
  'transitionteamwiki': 'transitionteam.wikimedia.org',
  'uawikimedia': 'ua.wikimedia.org',
  'ukwikimedia': 'uk.wikimedia.org',
  'usabilitywiki': 'usability.wikimedia.org',
  'votewiki': 'vote.wikimedia.org',
  'wg_enwiki': 'wg-en.wikipedia.org',
  'wikidatawiki': 'wikidata.org',
  'wikimania2005wiki': 'wikimania2005.wikimedia.org',
  'wikimania2006wiki': 'wikimania2006.wikimedia.org',
  'wikimania2007wiki': 'wikimania2007.wikimedia.org',
  'wikimania2008wiki': 'wikimania2008.wikimedia.org',
  'wikimania2009wiki': 'wikimania2009.wikimedia.org',
  'wikimania2010wiki': 'wikimania2010.wikimedia.org',
  'wikimania2011wiki': 'wikimania2011.wikimedia.org',
  'wikimania2012wiki': 'wikimania2012.wikimedia.org',
  'wikimania2013wiki': 'wikimania2013.wikimedia.org',
  'wikimania2014wiki': 'wikimania2014.wikimedia.org',
  'wikimania2015wiki': 'wikimania2015.wikimedia.org',
  'wikimania2016wiki': 'wikimania2016.wikimedia.org',
  'wikimania2017wiki': 'wikimania2017.wikimedia.org',
  'wikimaniateamwiki': 'wikimaniateam.wikimedia.org',
  'zerowiki': 'zero.wikimedia.org'
};

module.exports = siteMap;

},{}],7:[function(require,module,exports){
'use strict';

var templates = {
  linearLegend: '<b>' + i18nMessages.totals + '</b> <% var total = chartData.reduce(function(a,b){ return a + b.sum }, 0); %>' + '<ul class=\"<%=name.toLowerCase()%>-legend\">' + '<%if(chartData.length > 1) {%><li><%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/' + i18nMessages.day + ')</li><% } %>' + '<% for (var i=0; i<datasets.length; i++){%>' + '<li><span class=\"indic\" style=\"background-color:<%=datasets[i].strokeColor%>\">' + "<a href='<%= pv.getPageURL(datasets[i].label) %>'><%=datasets[i].label%></a></span> " + '<%= formatNumber(chartData[i].sum) %> (<%= formatNumber(Math.round(chartData[i].sum / numDaysInRange())) %>/' + i18nMessages.day + ')</li><%}%></ul>',
  circularLegend: '<b>' + i18nMessages.totals + '</b> <% var total = chartData.reduce(function(a,b){ return a + b.value }, 0); %>' + '<ul class=\"<%=name.toLowerCase()%>-legend\">' + '<%if(chartData.length > 1) {%><li><%= formatNumber(total) %> (<%= formatNumber(Math.round(total / numDaysInRange())) %>/' + i18nMessages.day + ')</li><% } %>' + '<% for (var i=0; i<segments.length; i++){%>' + '<li><span class=\"indic\" style=\"background-color:<%=segments[i].fillColor%>\">' + "<a href='<%= pv.getPageURL(segments[i].label) %>'><%=segments[i].label%></a></span> " + '<%= formatNumber(chartData[i].value) %> (<%= formatNumber(Math.round(chartData[i].value / numDaysInRange())) %>/' + i18nMessages.day + ')</li><%}%></ul>'
};

module.exports = templates;

},{}]},{},[4,5,6,2]);

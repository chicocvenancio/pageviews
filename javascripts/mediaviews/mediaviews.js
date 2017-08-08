/**
 * Mediaviews Analysis tool
 * @file Main file for Mediaviews application
 * @author MusikAnimal
 * @copyright 2016-17 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 * @requires Pv
 * @requires ChartHelpers
 */

const config = require('./config');
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');

/** Main MediaViews class */
class MediaViews extends mix(Pv).with(ChartHelpers) {
  /**
   * Set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'mediaviews';
    this.specialRange = null;
    this.fileInfo = {};

    /**
     * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
     * caused by race conditions between consecutive ajax calls. They are actually
     * not critical and can be avoided with this empty function.
     */
    window.fileSuggestionCallback = $.noop;
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   */
  initialize() {
    this.setupSelect2();
    this.setupSelect2Colors();
    this.popParams();
    this.setupListeners();
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   */
  popParams() {
    this.startSpinny();

    let params = this.validateParams(
      this.parseQueryString('files')
    );

    $(this.config.dataSourceSelector).val(params.source);
    this.setupDataSourceSelector();
    $(this.config.platformSelector).val(params.platform);

    this.setupDateRangeSelector();
    this.validateDateRange(params);
    this.resetSelect2();

    if (!params.files || !params.files.length || (params.files.length === 1 && !params.files[0])) {
      params.files = this.config.defaults.files;
    } else if (params.files.length > 10) {
      params.files = params.files.slice(0, 10); // max 10 files
    }

    this.setInitialChartType(params.files.length);
    this.setSelect2Defaults(params.files);
  }

  /**
   * Get statistics for the given files
   * @param  {Array} files - file names, ['Example.wav', 'Example.webm', ...]
   * @return {Deferred} Promise resolving with the stats for each file
   */
  getFileInfo(files) {
    let dfd = $.Deferred();

    // Don't re-query for files we already have data on.
    const currentFiles = Object.keys(this.fileInfo);
    files = files.filter(file => {
      return !currentFiles.includes(file);
    });

    // First make array of pages *fully* URI-encoded so we can easily reference them
    // The issue is the API only returns encoded file names, so we have to reliably be
    //   able to encode that and reference the original array
    try {
      files = files.map(file => encodeURIComponent(decodeURIComponent(`File:${file}`)));
    } catch (e) {
      // nothing, this happens when they use an unencoded title like %
      //   that JavaScript gets confused about when decoding
    }

    return $.ajax({
      url: 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&' +
        `iiprop=mediatype|size|timestamp&formatversion=2&format=json&titles=${files.join('|')}`,
      dataType: 'jsonp'
    }).then(data => {
      // restore original order of files, taking into account out any file names that were normalized
      if (data.query.normalized) {
        data.query.normalized.forEach(n => {
          // API returns decoded page name, so encode and compare against original array
          files[files.indexOf(encodeURIComponent(n.from))] = encodeURIComponent(n.to);
        });
      }
      let fileData = {};
      files.forEach(file => {
        // decode once more so the return fileData object is human-readable
        try {
          file = decodeURIComponent(file);
        } catch (e) {
          // same as above, catch error when JavaScript is unable to decode
        }
        let fileInfo = data.query.pages.find(p => p.title === file);

        // Throw error and remove from list if missing
        if (file.missing) {
          this.writeMessage(`${this.getFileLink(file)}: ${$.i18n('api-error-no-data')}`);
          return;
        }

        // Otherwise normalize data down to just what we want (imageinfo hash)
        fileInfo = fileInfo.imageinfo && fileInfo.imageinfo[0] ? fileInfo.imageinfo[0] : {};

        // Throw error and remove from list if not audio or video
        if (!['AUDIO', 'VIDEO'].includes(fileInfo.mediatype)) {
          this.writeMessage($.i18n('invalid-media-file', this.getFileLink(file)));
          return;
        }

        fileData[file.replace(/^File:/, '')] = Object.assign({
          title: file
        }, fileInfo);
      });

      Object.assign(this.fileInfo, fileData);

      return dfd.resolve(fileData);
    });
  }

  /**
   * Get all user-inputted parameters except the files
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} source, etc.
   */
  getParams(specialRange = true) {
    let params = {
      source: $(this.config.dataSourceSelector).val()
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in this.config.specialRanges, constructed like `{range: 'last-month'}`,
     *   or a relative range like `{range: 'latest-N'}` where N is the number of days.
     */
    if (this.specialRange && specialRange) {
      params.range = this.specialRange.range;
    } else if (this.isMonthly()) {
      params.start = moment(
        this.monthStartDatepicker.getDate()
      ).format('YYYY-MM');
      params.end = moment(
        this.monthEndDatepicker.getDate()
      ).format('YYYY-MM');
    } else {
      params.start = this.daterangepicker.startDate.format('YYYY-MM-DD');
      params.end = this.daterangepicker.endDate.format('YYYY-MM-DD');
    }

    /** add autolog param only if it was passed in originally, and only if it was false (true would be default) */
    if (this.noLogScale) params.autolog = 'false';

    return params;
  }

  /**
   * Push relevant class properties to the query string
   * Called whenever we go to update the chart
   */
  pushParams() {
    const files = $(this.config.select2Input).select2('val') || [];

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&files=${files.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&files=${files.join('%7C')}`);
  }

  /**
   * Sets up the file selector and adds listener to update chart
   */
  setupSelect2() {
    const $select2Input = $(this.config.select2Input);

    let params = {
      ajax: {
        url: 'https://commons.wikimedia.org/w/api.php',
        dataType: 'jsonp',
        delay: 200,
        jsonpCallback: 'fileSuggestionCallback',
        data: search => {
          return {
            action: 'query',
            list: 'prefixsearch',
            format: 'json',
            pssearch: search.term || '',
            psnamespace: 6,
            cirrusUseCompletionSuggester: 'yes'
          };
        },
        processResults: function(data) {
          const query = data ? data.query : {};
          let results = [];

          if (!query) return {results};

          if (query.prefixsearch.length) {
            results = query.prefixsearch.map(function(elem) {
              const title = elem.title.replace(/^File:/, '');
              return {
                id: title.score(),
                text: title
              };
            });
          }
          return {results};
        },
        cache: true
      },
      placeholder: $.i18n('projects-placeholder'),
      maximumSelectionLength: 10,
      minimumInputLength: 1
    };

    $select2Input.select2(params);
    $select2Input.off('select2:select').on('select2:select', this.processInput.bind(this));
    $select2Input.off('select2:unselect').on('select2:unselect', e => {
      this.processInput(false, e.params.data.text);
      $select2Input.trigger('select2:close');
    });
  }

  /**
   * Setup listeners for the data source selector
   */
  setupDataSourceSelector() {
    $(this.config.dataSourceSelector).on('change', e => {
      this.processInput();
    });
  }

  /**
   * General place to add page-wide listeners
   * @override
   */
  setupListeners() {
    super.setupListeners();
    $('.sort-link').on('click', e => {
      const sortType = $(e.currentTarget).data('type');
      this.direction = this.sort === sortType ? -this.direction : 1;
      this.sort = sortType;
      this.updateTable();
    });
    $('.clear-pages').on('click', () => {
      this.resetView(true);
      this.focusSelect2();
    });
  }

  /**
   * Removes chart, messages, and resets site selections
   * @param {boolean} [select2] whether or not to clear the Select2 input
   * @param {boolean} [clearMessages] whether or not to clear any exisitng errors from view
   * @override
   */
  resetView(select2 = false, clearMessages = true) {
    super.resetView(select2, clearMessages);
    $('.output-list').html('');
    $('.single-entity-stats').html('');
    $('.single-entity-legend').html('');
    $('.file-selector').removeClass('disabled');
  }

  /**
   * Query the API for each file, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @param {string} [removedFile] - file that was just removed via Select2, supplied by select2:unselect handler
   * @return {null}
   */
  processInput(force, removedFile) {
    this.pushParams();
    this.patchUsage();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && location.search === this.params && this.prevChartType === this.chartType) {
      return;
    }

    this.params = location.search;

    const files = $(config.select2Input).select2('val') || [];

    if (!files.length) {
      return this.resetView();
    }

    this.setInitialChartType(files.length);

    // clear out old error messages unless the is the first time rendering the chart
    if (this.prevChartType) this.clearMessages();

    this.prevChartType = this.chartType;
    this.destroyChart();
    this.startSpinny();

    if (removedFile) {
      // we've got the data already, just removed a single page so we'll remove that data
      // and re-render the chart
      this.outputData = this.outputData.filter(entry => entry.label !== removedFile.descore());
      this.outputData = this.outputData.map(entity => {
        return Object.assign({}, entity, this.config.chartConfig[this.chartType].dataset(entity.color));
      });
      delete this.fileInfo[removedFile];
      this.updateChart();
    } else {
      this.getFileInfo(files).then(() => {
        this.getPlayCounts(files).done(xhrData => {
          const fileNames = files.map(file => `File:${file}`);
          this.getPageViewsData(fileNames).done(pvData => {
            pvData = this.buildChartData(pvData.datasets, fileNames, 'views');

            // Loop through once more to supply this.fileInfo with the pageviews data
            pvData.forEach(pvEntry => {
              // Make sure file exists in fileInfo just as a safeguard
              const title = pvEntry.label.replace(/^File:/, '');
              if (this.fileInfo[title]) {
                Object.assign(this.fileInfo[title], {
                  pageviews: pvEntry.sum,
                  pageviewsAvg: pvEntry.average
                });
              }
            });

            this.updateChart(xhrData);
          });
        });
      });
    }
  }

  getMPCApiUrl(file, startDate, endDate) {
    return `https://tools.wmflabs.org/mediaplaycounts/api/1/FilePlaycount/date_range/${file}/` +
      `${startDate.format(this.config.mpcDateFormat)}/${endDate.format(this.config.mpcDateFormat)}`;
  }

  getPlayCounts(files) {
    let dfd = $.Deferred(),
      totalRequestCount = files.length,
      failedFiles = [],
      count = 0;

    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    /**
     * everything we need to keep track of for the promises
     * @type {Object}
     */
    let xhrData = {
      entities: files,
      labels: [], // Labels (dates) for the x-axis.
      datasets: new Array(totalRequestCount), // Data for each article timeseries
      errors: [], // Queue up errors to show after all requests have been made
      fatalErrors: [], // Unrecoverable JavaScript errors
      promises: []
    };

    const makeRequest = (file, index) => {
      const url = this.getMPCApiUrl(file, startDate, endDate),
        promise = $.ajax({ url, dataType: 'json' });

      xhrData.promises.push(promise);

      promise.done(successData => {
        try {
          const fileIndex = xhrData.entities.indexOf(file);
          xhrData.datasets[fileIndex] = successData.details;

          /** fetch the labels for the x-axis on success if we haven't already */
          if (successData.details && !xhrData.labels.length) {
            xhrData.labels = successData.details.map(elem => {
              return moment(elem.date, this.config.mpcDateFormat).format(this.dateFormat);
            });
          }
        } catch (err) {
          return xhrData.fatalErrors.push(err);
        }
      }).fail(errorData => {
        // remove this article from the list of files to analyze
        const fileIndex = xhrData.entities.indexOf(file);
        xhrData.entities.splice(fileIndex, 1);
        xhrData.datasets.splice(fileIndex, 1);

        // if (this.app === 'pageviews' && errorData.status === 404) {
        //   // check if it is a new page, and if so show a message that the data isn't available yet
        //   $.ajax({
        //     url: `https://${this.project}.org/w/api.php?action=query&prop=revisions&rvprop=timestamp` +
        //       `&rvdir=newer&rvlimit=1&formatversion=2&format=json&titles=${entity}`,
        //     dataType: 'jsonp'
        //   }).then(data => {
        //     const dateCreated = data.query.pages[0].revisions ? data.query.pages[0].revisions[0].timestamp : null;
        //     if (dateCreated && moment(dateCreated).isAfter(this.maxDate)) {
        //       const faqLink = `<a href='/pageviews/faq#todays_data'>${$.i18n('learn-more').toLowerCase()}</a>`;
        //       this.toastWarn($.i18n('new-article-warning', faqLink));
        //     }
        //   });
        // }

        let link = this.getFileLink(file);

        // // user-friendly error messages
        // let endpoint = 'pageviews';
        // if (this.isUniqueDevices()) {
        //   endpoint = 'unique-devices';
        // } else if (this.isPagecounts()) {
        //   endpoint = 'pagecounts';
        // }
        xhrData.errors.push(
          `${link}: ${$.i18n('api-error', 'Playcounts API')} - ${errorData.responseJSON.title}`
        );
      }).always(() => {
        if (++count === totalRequestCount) {
          this.playCountsData = xhrData;
          dfd.resolve(xhrData);

          if (failedFiles.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedFiles.map(failedFile => `<li>${this.getFileLink(failedFile)}</li>`).join('') +
              '</ul>'
            ));
          }
        }
      });
    };

    files.forEach((file, index) => makeRequest(file, index));

    return dfd;
  }

  /**
   * Update the page comparison table, shown below the chart
   * @return {null}
   */
  updateTable() {
    if (this.outputData.length === 1) {
      return this.showSingleEntityLegend();
    } else {
      $('.single-file-stats').html('');
      $('.single-file-ranking').html('');
    }

    $('.output-list').html('');

    /** sort ascending by current sort setting, using slice() to clone the array */
    const datasets = this.outputData.slice().sort((a, b) => {
      const before = this.getSortProperty(a, this.sort),
        after = this.getSortProperty(b, this.sort);

      if (before < after) {
        return this.direction;
      } else if (before > after) {
        return -this.direction;
      } else {
        return 0;
      }
    });

    $('.sort-link .glyphicon').removeClass('glyphicon-sort-by-alphabet-alt glyphicon-sort-by-alphabet').addClass('glyphicon-sort');
    const newSortClassName = parseInt(this.direction, 10) === 1 ? 'glyphicon-sort-by-alphabet-alt' : 'glyphicon-sort-by-alphabet';
    $(`.sort-link--${this.sort} .glyphicon`).addClass(newSortClassName).removeClass('glyphicon-sort');

    datasets.forEach((item, index) => {
      $('.output-list').append(this.config.templates.tableRow(this, item));
    });

    // add summations to show up as the bottom row in the table
    const sum = datasets.reduce((a,b) => a + b.sum, 0);
    let totals = {
      label: $.i18n('num-projects', this.formatNumber(datasets.length), datasets.length),
      sum,
      average: Math.round(sum / this.numDaysInRange()),
    };
    ['pages', 'articles', 'edits', 'images', 'users', 'activeusers', 'admins'].forEach(type => {
      totals[type] = datasets.reduce((a, b) => a + b[type], 0);
    });
    $('.output-list').append(this.config.templates.tableRow(this, totals, true));

    $('.table-view').show();
  }

  /**
   * Get value of given page for the purposes of column sorting in table view
   * @param  {object} item - page name
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    if (type === 'active-users') {
      return Number(item.activeusers);
    } else if (type === 'label') {
      return item.label;
    }
    return Number(item[type]);
  }

  /**
   * Get link to file, or message if querying for all files
   * @override
   */
  getFileLink(file) {
    return super.getPageLink(file, 'commons.wikimedia.org');
  }

  /**
   * Show info below the chart when there is only one file being queried
   */
  showSingleEntityLegend() {
    const file = this.outputData[0];

    $('.table-view').hide();
    $('.single-entity-stats').html(`
      ${this.getFileLink(`File:${file.label}`)}
      &middot;
      <span class='text-muted'>
        ${$(this.config.dateRangeSelector).val()}
      </span>
      &middot;
      ${$.i18n('num-playcounts', this.formatNumber(file.sum), file.sum)}
      <span class='hidden-lg'>
        (${this.formatNumber(file.average)}/${$.i18n('day')})
      </span>
    `);
    $('.single-entity-legend').html(
      this.config.templates.chartLegend(this)
    );
  }

  /**
   * Extends super.validateParams to handle special conditional params specific to Mediaviews
   * @param {Object} params - params as fetched by this.parseQueryString()
   * @returns {Object} same params with some invalid parameters correted, as necessary
   * @override
   */
  validateParams(params) {
    return super.validateParams(params);
  }
}

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new MediaViews();
});

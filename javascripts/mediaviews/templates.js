/**
 * @file Templates used by Chart.js for Mediaviews app
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

/**
 * Templates used by Chart.js.
 * Functions used within our app must be in the global scope.
 * All quotations must be double-quotes or properly escaped.
 * @type {Object}
 */
const templates = {
  chartLegend(scope) {
    const dataList = (entity, multiEntity = false) => {
      let infoHash = {
        [$.i18n('playcounts')]: {
          [$.i18n('playcounts')]: scope.formatNumber(entity.sum),
          [$.i18n('daily-average')]: scope.formatNumber(entity.average)
        }
      };

      const fileInfo = scope.fileInfo[entity.label],
        duration = Math.round(fileInfo.duration);

      infoHash[$.i18n('pageviews')] = {
        [$.i18n('pageviews')]: scope.formatNumber(fileInfo.pageviews),
        [$.i18n('daily-average')]: scope.formatNumber(fileInfo.pageviewsAvg)
      };

      infoHash[$.i18n('statistics')] = {
        [$.i18n('duration')]: $.i18n('num-seconds', duration, scope.formatNumber(duration)),
        [$.i18n('size')]: scope.formatNumber(fileInfo.size),
        [$.i18n('date')]: moment(fileInfo.timestmap).format(scope.dateFormat),
        [$.i18n('type')]: fileInfo.mediatype.toLowerCase()
      };

      let markup = '';

      for (let block in infoHash) {
        const blockId = block.toLowerCase().score();
        markup += `<div class='legend-block legend-block--${blockId}'>
          <h5>${block}</h5><hr/>
          <div class='legend-block--body'>`;
        for (let key in infoHash[block]) {
          const value = infoHash[block][key];
          if (!value) continue;
          markup += `
            <div class="linear-legend--counts">
              ${key}:
              <span class='pull-right'>
                ${value}
              </span>
            </div>`;
        }
        markup += '</div></div>';
      }

      // if (!multiEntity) {
      // }

      return markup;
    };

    if (scope.outputData.length === 1) {
      return dataList(scope.outputData[0]);
    }

    const sum = scope.outputData.reduce((a,b) => a + b.sum, 0);
    const totals = {
      sum,
      average: Math.round(sum / scope.numDaysInRange()),
      // pages: scope.outputData.reduce((a, b) => a + b.pages, 0),
      // articles: scope.outputData.reduce((a, b) => a + b.articles, 0),
      // edits: scope.outputData.reduce((a, b) => a + b.edits, 0),
      // images: scope.outputData.reduce((a, b) => a + b.images, 0),
      // users: scope.outputData.reduce((a, b) => a + b.users, 0),
      // activeusers: scope.outputData.reduce((a, b) => a + b.activeusers, 0),
      // admins: scope.outputData.reduce((a, b) => a + b.admins, 0)
    };

    return dataList(totals, true);
  },

  tableRow(scope, item, last = false) {
    const tag = last ? 'th' : 'td';
    const linksRow = last ? '' : `
        <a href="#" target="_blank">${$.i18n('most-viewed-pages')}</a>
      `;

    $('.sort-link--sum .col-heading').text($.i18n('playcounts'));

    return `
      <tr>
        <${tag} class='table-view--color-col'>
          <span class='table-view--color-block' style="background:${item.color}"></span>
        </${tag}>
        <${tag} class='table-view--project'>${last ? item.label : scope.getFileLink(item.label)}</${tag}>
        <${tag} class='table-view--views'>${scope.formatNumber(item.sum)}</${tag}>
        <${tag} class='table-view--average'>${scope.formatNumber(item.average)}</${tag}>
        <${tag}>${linksRow}</${tag}>
      </tr>
    `;
  }
};

module.exports = templates;

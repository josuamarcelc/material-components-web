/*
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const Cli = require('./cli');
const CloudStorage = require('./cloud-storage');
const GitRepo = require('./git-repo');
const GoldenIo = require('./golden-io');
const ImageDiffer = require('./image-differ');
const ReportBuilder = require('./report-builder');
const ReportWriter = require('./report-writer');
const SeleniumApi = require('./selenium-api');

class SeleniumController {
  constructor() {
    /**
     * @type {!Cli}
     * @private
     */
    this.cli_ = new Cli();

    /**
     * @type {!CloudStorage}
     * @private
     */
    this.cloudStorage_ = new CloudStorage();

    /**
     * @type {!GitRepo}
     * @private
     */
    this.gitRepo_ = new GitRepo();

    /**
     * @type {!GoldenIo}
     * @private
     */
    this.goldenIo_ = new GoldenIo();

    /**
     * @type {!ImageDiffer}
     * @private
     */
    this.imageDiffer_ = new ImageDiffer();

    /**
     * @type {!ReportBuilder}
     * @private
     */
    this.reportBuilder_ = new ReportBuilder();

    /**
     * @type {!ReportWriter}
     * @private
     */
    this.reportWriter_ = new ReportWriter();

    /**
     * @type {!SeleniumApi}
     * @private
     */
    this.seleniumApi_ = new SeleniumApi();
  }

  /**
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async initForApproval() {
    const runReportJsonUrl = this.cli_.runReportJsonUrl;
    return this.reportBuilder_.initForApproval({runReportJsonUrl});
  }

  /**
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async initForCapture() {
    const isOnline = await this.cli_.isOnline();
    if (isOnline) {
      await this.gitRepo_.fetch();
    }
    return this.reportBuilder_.initForCapture();
  }

  /**
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async initForDemo() {
    const isOnline = await this.cli_.isOnline();
    if (isOnline) {
      await this.gitRepo_.fetch();
    }
    return this.reportBuilder_.initForDemo();
  }

  /**
   * @param {!mdc.proto.ReportData} reportData
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async uploadAllAssets(reportData) {
    await this.cloudStorage_.uploadAllAssets(reportData);
    return reportData;
  }

  /**
   * @param {!mdc.proto.ReportData} reportData
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async captureAllPages(reportData) {
    await this.seleniumApi_.captureAllPages(reportData);
    await this.cloudStorage_.uploadAllScreenshots(reportData);
    return reportData;
  }

  /**
   * @param {!mdc.proto.ReportData} reportData
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async compareAllScreenshots(reportData) {
    await this.imageDiffer_.compareAllScreenshots(reportData);
    await this.cloudStorage_.uploadAllDiffs(reportData);
    return reportData;
  }

  /**
   * @param {!mdc.proto.ReportData} reportData
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async uploadDiffReport(reportData) {
    // TODO(acdvorak): Implement
    await this.reportWriter_.generateHtml(reportData);
    await this.cloudStorage_.uploadDiffReport(reportData);

    // TODO(acdvorak): Fill out
    // reportData.meta.report_page_url = 'FOO';
    // reportData.meta.report_json_url = 'FOO';

    console.log('\n\nDONE uploading diff report to GCS!\n\n');
    console.log(reportData.meta.report_page_url);

    return reportData;
  }

  /**
   * @param {!mdc.proto.ReportData} reportData
   * @return {!Promise<!mdc.proto.ReportData>}
   */
  async updateGoldenJson(reportData) {
    /** @type {!GoldenFile} */
    const newGoldenFile = await this.goldenIo_.approveSelectedGoldens(reportData);
    await this.goldenIo_.writeToDisk(newGoldenFile);
    return reportData;
  }
}

module.exports = SeleniumController;
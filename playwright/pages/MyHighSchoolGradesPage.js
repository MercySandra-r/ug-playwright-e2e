// @ts-check
const { expect } = require('@playwright/test');
const BasePage = require('./BasePage');

/**
 * Page Object for My High School Grades related actions
 */
class MyHighSchoolGradesPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page - The Playwright page object
     */
    constructor(page) {
        super(page, 'MyHighSchoolGradesPage');
        
        // Define page selectors
        this.selectors = {
            // Page header and navigation
            pageTitle: 'h1',
            
            // Report Type Section
            reportTypeSection: '.report-type-section',
            selfReportSeniorYearRadio: 'input[name="reportType"][value="selfReportSenior"]',
            selfReportAllGradesRadio: 'input[name="reportType"][value="selfReportAll"]',
            transcriptOnlyRadio: 'input[name="reportType"][value="transcriptOnly"]',
            
            // Academic Information Section
            academicInfoSection: '.academic-info-section',
            graduationStatusDropdown: 'select[name="graduationStatus"]',
            graduationMonthDropdown: 'select[name="graduationMonth"]',
            graduationYearDropdown: 'select[name="graduationYear"]',
            unweightedGPAInput: 'input[name="unweightedGPA"]',
            classRankInput: 'input[name="classRank"]',
            classSizeInput: 'input[name="classSize"]',
            gpaScaleDropdown: 'select[name="gpaScale"]',
            gradingSystemDropdown: 'select[name="gradingSystem"]',
            
            // Course Entry Section
            courseEntrySection: '.course-entry-section',
            subjectTabs: '.subject-tabs',
            subjectTab: (subject) => `.subject-tab:has-text("${subject}")`,
            academicYearDropdown: 'select[name="academicYear"]',
            courseNameInput: 'input[name="courseName"]',
            courseLevelDropdown: 'select[name="courseLevel"]',
            durationDropdown: 'select[name="duration"]',
            gradeInput: 'input[name="grade"]',
            addCourseButton: 'button:has-text("Add Course")',
            
            // Course List
            courseList: '.course-list',
            courseItem: '.course-item',
            courseName: '.course-name',
            courseGrade: '.course-grade',
            editCourseButton: 'button:has-text("Edit")',
            removeCourseButton: 'button:has-text("Remove")',
            
            // Form Actions
            saveButton: 'button:has-text("Save")',
            saveAndContinueButton: 'button:has-text("Save & Continue")',
            
            // Error Messages
            errorMessage: '.error-message',
            validationError: '.validation-error',
            
            // Confirmation Modal
            confirmationModal: '.confirmation-modal',
            confirmButton: 'button:has-text("Confirm")',
            cancelButton: 'button:has-text("Cancel")'
        };
    }
    
    /**
     * Navigate to the My High School Grades page
     * @returns {Promise<void>}
     */
    async navigateToMyHighSchoolGrades() {
        await this.gotoApplicationStep('my-high-school-grades');
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
    }
    
    /**
     * Verify the My High School Grades page is loaded
     * @returns {Promise<void>}
     */
    async verifyPageLoaded() {
        await expect(this.page).toHaveURL(/.*my-high-school-grades/);
        await expect(this.page.locator(this.selectors.pageTitle))
            .toContainText('My High School Grades');
    }
    
    /**
     * Validate the My High School Grades page content
     * @returns {Promise<boolean>} Whether the page content is valid
     */
    async validateMyHighSchoolGrade() {
        try {
            await this.page.waitForSelector(this.selectors.reportTypeSection, { state: 'visible' });
            await this.page.waitForSelector(this.selectors.academicInfoSection, { state: 'visible' });
            await this.page.waitForSelector(this.selectors.courseEntrySection, { state: 'visible' });
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Select a report type
     * @param {'selfReportSenior'|'selfReportAll'|'transcriptOnly'} reportType - The type of report to select
     * @returns {Promise<void>}
     */
    async selectReportType(reportType) {
        switch (reportType) {
            case 'selfReportSenior':
                await this.page.check(this.selectors.selfReportSeniorYearRadio);
                break;
            case 'selfReportAll':
                await this.page.check(this.selectors.selfReportAllGradesRadio);
                break;
            case 'transcriptOnly':
                await this.page.check(this.selectors.transcriptOnlyRadio);
                break;
            default:
                throw new Error(`Invalid report type: ${reportType}`);
        }
        
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Select a random report type (self-report senior year or all grades)
     * @returns {Promise<string>} The selected report type
     */
    async selectRandomSelfReportType() {
        const reportTypes = ['selfReportSenior', 'selfReportAll'];
        const randomIndex = Math.floor(Math.random() * reportTypes.length);
        const selectedType = reportTypes[randomIndex];
        
        await this.selectReportType(selectedType);
        return selectedType;
    }
    
    /**
     * Select a random graduation status (future or past)
     * @returns {Promise<string>} The selected graduation status
     */
    async selectRandomGraduationStatus() {
        const statuses = ['future', 'past'];
        const randomIndex = Math.floor(Math.random() * statuses.length);
        const selectedStatus = statuses[randomIndex];
        
        await this.page.selectOption(this.selectors.graduationStatusDropdown, selectedStatus);
        await this.page.waitForLoadState('networkidle');
        
        return selectedStatus;
    }
    
    /**
     * Enter academic details
     * @param {Object} academicInfo - Academic information
     * @param {string} [academicInfo.unweightedGPA] - Unweighted GPA
     * @param {string} [academicInfo.classRank] - Class rank
     * @param {string} [academicInfo.classSize] - Class size
     * @returns {Promise<void>}
     */
    async enterAcademicDetails({ unweightedGPA, classRank, classSize }) {
        if (unweightedGPA) {
            await this.page.fill(this.selectors.unweightedGPAInput, unweightedGPA);
        }
        
        if (classRank) {
            await this.page.fill(this.selectors.classRankInput, classRank);
        }
        
        if (classSize) {
            await this.page.fill(this.selectors.classSizeInput, classSize);
        }
    }
    
    /**
     * Validate academic details
     * @param {Object} expectedInfo - Expected academic information
     * @param {string} expectedInfo.unweightedGPA - Expected unweighted GPA
     * @param {string} expectedInfo.classRank - Expected class rank
     * @param {string} expectedInfo.classSize - Expected class size
     * @returns {Promise<boolean>} Whether the academic details match the expected values
     */
    async validateAcademicDetails({ unweightedGPA, classRank, classSize }) {
        try {
            if (unweightedGPA) {
                const actualGPA = await this.page.inputValue(this.selectors.unweightedGPAInput);
                if (actualGPA !== unweightedGPA) return false;
            }
            
            if (classRank) {
                const actualRank = await this.page.inputValue(this.selectors.classRankInput);
                if (actualRank !== classRank) return false;
            }
            
            if (classSize) {
                const actualSize = await this.page.inputValue(this.selectors.classSizeInput);
                if (actualSize !== classSize) return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error validating academic details:', error);
            return false;
        }
    }
    
    /**
     * Select GPA scale
     * @param {string} scale - The GPA scale to select
     * @returns {Promise<void>}
     */
    async selectGPAScale(scale) {
        await this.page.selectOption(this.selectors.gpaScaleDropdown, scale);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Select grading system
     * @param {string} system - The grading system to select
     * @returns {Promise<void>}
     */
    async selectGradingSystem(system) {
        await this.page.selectOption(this.selectors.gradingSystemDropdown, system);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Add a course
     * @param {Object} course - Course information
     * @param {string} course.subject - Course subject
     * @param {string} course.academicYear - Academic year
     * @param {string} course.name - Course name
     * @param {string} course.level - Course level
     * @param {string} course.duration - Course duration
     * @param {string} course.grade - Course grade
     * @returns {Promise<void>}
     */
    async addCourse({ subject, academicYear, name, level, duration, grade }) {
        // Select subject tab
        await this.page.click(this.selectors.subjectTab(subject));
        
        // Fill in course details
        if (academicYear) {
            await this.page.selectOption(this.selectors.academicYearDropdown, academicYear);
        }
        
        if (name) {
            await this.page.fill(this.selectors.courseNameInput, name);
        }
        
        if (level) {
            await this.page.selectOption(this.selectors.courseLevelDropdown, level);
        }
        
        if (duration) {
            await this.page.selectOption(this.selectors.durationDropdown, duration);
        }
        
        if (grade) {
            await this.page.fill(this.selectors.gradeInput, grade);
        }
        
        // Add the course
        await this.page.click(this.selectors.addCourseButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Validate a course was added
     * @param {Object} course - Expected course information
     * @param {string} course.name - Expected course name
     * @param {string} course.grade - Expected course grade
     * @returns {Promise<boolean>} Whether the course was found with the expected details
     */
    async validateCourse({ name, grade }) {
        try {
            const courseItems = await this.page.$$(this.selectors.courseItem);
            
            for (const item of courseItems) {
                const courseName = await item.$(this.selectors.courseName);
                const courseGrade = await item.$(this.selectors.courseGrade);
                
                if (courseName && courseGrade) {
                    const courseNameText = await courseName.textContent();
                    const courseGradeText = await courseGrade.textContent();
                    
                    if (courseNameText.includes(name) && courseGradeText.includes(grade)) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error validating course:', error);
            return false;
        }
    }
    
    /**
     * Verify error message is displayed
     * @param {string} expectedMessage - The expected error message
     * @returns {Promise<boolean>} Whether the error message is displayed and matches
     */
    async verifyErrorMessage(expectedMessage) {
        try {
            const errorLocator = this.page.locator(this.selectors.errorMessage);
            await errorLocator.waitFor({ state: 'visible', timeout: 5000 });
            const actualMessage = await errorLocator.textContent();
            return actualMessage.includes(expectedMessage);
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Save the page
     * @returns {Promise<boolean>} Whether the save was successful
     */
    async save() {
        try {
            await this.page.click(this.selectors.saveButton);
            await this.page.waitForSelector(this.selectors.confirmationModal, { state: 'visible', timeout: 5000 });
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Save and continue to the next section
     * @returns {Promise<void>}
     */
    async saveAndContinue() {
        await this.page.click(this.selectors.saveAndContinueButton);
        await this.page.waitForLoadState('networkidle');
    }
    
    /**
     * Scroll the page
     * @returns {Promise<void>}
     */
    async scroll() {
        await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
    }
    
    /**
     * Validate the grading system
     * @returns {Promise<boolean>} Whether the grading system is valid
     */
    async validateGradingSystem() {
        try {
            const gradingSystem = await this.page.$(this.selectors.gradingSystemDropdown);
            return gradingSystem !== null;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Validate the course title
     * @returns {Promise<boolean>} Whether the course title is valid
     */
    async validateCourseTitle() {
        try {
            const courseTitle = await this.page.$(this.selectors.courseNameInput);
            return courseTitle !== null;
        } catch (error) {
            return false;
        }
    }
}

module.exports = MyHighSchoolGradesPage;

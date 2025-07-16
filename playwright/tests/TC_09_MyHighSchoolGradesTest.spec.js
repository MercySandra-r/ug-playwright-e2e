// @ts-check
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const MyHighSchoolGradesPage = require('../pages/MyHighSchoolGradesPage');

/**
 * Test data for high school grades
 */
const testCourses = [
    {
        subject: 'Math',
        academicYear: '2022-2023',
        name: 'Algebra II',
        level: 'Honors',
        duration: 'Full Year',
        grade: 'A'
    },
    {
        subject: 'Science',
        academicYear: '2022-2023',
        name: 'Chemistry',
        level: 'AP',
        duration: 'Full Year',
        grade: 'B+'
    },
    {
        subject: 'English',
        academicYear: '2022-2023',
        name: 'American Literature',
        level: 'Regular',
        duration: 'Full Year',
        grade: 'A-'
    },
    {
        subject: 'History',
        academicYear: '2022-2023',
        name: 'US History',
        level: 'AP',
        duration: 'Full Year',
        grade: 'A'
    },
    {
        subject: 'Foreign Language',
        academicYear: '2022-2023',
        name: 'Spanish III',
        level: 'Honors',
        duration: 'Full Year',
        grade: 'A-'
    }
];

/**
 * Test suite for My High School Grades page functionality
 */
test.describe('My High School Grades Page Tests', () => {
    let loginPage;
    let myHighSchoolGradesPage;
    let testUser;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        myHighSchoolGradesPage = new MyHighSchoolGradesPage(page);
        
        // Test user data
        testUser = {
            email: process.env.TEST_EMAIL || 'test@example.com',
            password: process.env.TEST_PASSWORD || 'TestPassword123!',
            academicInfo: {
                unweightedGPA: '3.75',
                classRank: '25',
                classSize: '500',
                gpaScale: '4.0',
                gradingSystem: 'Letter Grades',
                graduationYear: '2023',
                graduationMonth: 'May'
            },
            courses: testCourses
        };

        // Login and navigate to My High School Grades page
        await loginPage.navigateToLoginPage();
        await loginPage.login(testUser.email, testUser.password);
        await myHighSchoolGradesPage.navigateToMyHighSchoolGrades();
    });

    test('Verify My High School Grades page loads successfully', async () => {
        // Verify page title and URL
        await expect(myHighSchoolGradesPage.page).toHaveURL(/.*my-high-school-grades/);
        await expect(myHighSchoolGradesPage.page.locator(myHighSchoolGradesPage.selectors.pageTitle))
            .toContainText('My High School Grades');
    });

    test('Validate My High School Grades page content', async () => {
        // Verify the page content is valid
        const isPageValid = await myHighSchoolGradesPage.validateMyHighSchoolGrade();
        expect(isPageValid).toBeTruthy();
    });

    test('Select random self-report type (senior year or all grades)', async () => {
        // Select a random report type
        const selectedType = await myHighSchoolGradesPage.selectRandomSelfReportType();
        
        // Verify a report type was selected
        expect(selectedType).toMatch(/selfReport(Senior|All)/);
        
        // Verify the appropriate radio button is checked
        if (selectedType === 'selfReportSenior') {
            const isChecked = await myHighSchoolGradesPage.page.isChecked(myHighSchoolGradesPage.selectors.selfReportSeniorYearRadio);
            expect(isChecked).toBeTruthy();
        } else {
            const isChecked = await myHighSchoolGradesPage.page.isChecked(myHighSchoolGradesPage.selectors.selfReportAllGradesRadio);
            expect(isChecked).toBeTruthy();
        }
    });

    test('Select transcript only report type', async () => {
        // Select transcript only report type
        await myHighSchoolGradesPage.selectReportType('transcriptOnly');
        
        // Verify the transcript only radio button is checked
        const isChecked = await myHighSchoolGradesPage.page.isChecked(myHighSchoolGradesPage.selectors.transcriptOnlyRadio);
        expect(isChecked).toBeTruthy();
    });

    test('Select random graduation status (future or past)', async () => {
        // Select a random graduation status
        const selectedStatus = await myHighSchoolGradesPage.selectRandomGraduationStatus();
        
        // Verify a status was selected
        expect(selectedStatus).toMatch(/future|past/);
        
        // Verify the selected status is reflected in the dropdown
        const selectedValue = await myHighSchoolGradesPage.page.$eval(
            myHighSchoolGradesPage.selectors.graduationStatusDropdown,
            select => select.value
        );
        expect(selectedValue).toBe(selectedStatus);
    });

    test('Enter and validate academic details', async () => {
        // Enter academic details
        await myHighSchoolGradesPage.enterAcademicDetails({
            unweightedGPA: testUser.academicInfo.unweightedGPA,
            classRank: testUser.academicInfo.classRank,
            classSize: testUser.academicInfo.classSize
        });
        
        // Validate the entered details
        const areDetailsValid = await myHighSchoolGradesPage.validateAcademicDetails({
            unweightedGPA: testUser.academicInfo.unweightedGPA,
            classRank: testUser.academicInfo.classRank,
            classSize: testUser.academicInfo.classSize
        });
        
        expect(areDetailsValid).toBeTruthy();
    });

    test('Select GPA scale and grading system', async () => {
        // Select GPA scale
        await myHighSchoolGradesPage.selectGPAScale(testUser.academicInfo.gpaScale);
        
        // Select grading system
        await myHighSchoolGradesPage.selectGradingSystem(testUser.academicInfo.gradingSystem);
        
        // Verify the selected values
        const selectedGPAScale = await myHighSchoolGradesPage.page.$eval(
            myHighSchoolGradesPage.selectors.gpaScaleDropdown,
            select => select.value
        );
        
        const selectedGradingSystem = await myHighSchoolGradesPage.page.$eval(
            myHighSchoolGradesPage.selectors.gradingSystemDropdown,
            select => select.value
        );
        
        expect(selectedGPAScale).toBe(testUser.academicInfo.gpaScale);
        expect(selectedGradingSystem).toBe(testUser.academicInfo.gradingSystem);
    });

    test('Add and validate a course', async () => {
        // Select a report type that allows course entry
        await myHighSchoolGradesPage.selectReportType('selfReportAll');
        
        // Add a course
        const testCourse = testUser.courses[0];
        await myHighSchoolGradesPage.addCourse(testCourse);
        
        // Validate the course was added
        const isCourseValid = await myHighSchoolGradesPage.validateCourse({
            name: testCourse.name,
            grade: testCourse.grade
        });
        
        expect(isCourseValid).toBeTruthy();
    });

    test('Add multiple courses across different subjects', async () => {
        // Select a report type that allows course entry
        await myHighSchoolGradesPage.selectReportType('selfReportAll');
        
        // Add multiple courses
        for (const course of testUser.courses) {
            await myHighSchoolGradesPage.addCourse(course);
            
            // Validate each course was added
            const isCourseValid = await myHighSchoolGradesPage.validateCourse({
                name: course.name,
                grade: course.grade
            });
            
            expect(isCourseValid).toBeTruthy();
        }
    });

    test('Verify error messages for required fields', async () => {
        // Try to save without filling required fields
        await myHighSchoolGradesPage.scroll();
        await myHighSchoolGradesPage.save();
        
        // Verify error message is displayed
        const hasError = await myHighSchoolGradesPage.verifyErrorMessage('Please fill in all required fields');
        expect(hasError).toBeTruthy();
    });

    test('Save the page', async () => {
        // Fill in required fields
        await myHighSchoolGradesPage.selectReportType('selfReportAll');
        await myHighSchoolGradesPage.enterAcademicDetails({
            unweightedGPA: testUser.academicInfo.unweightedGPA,
            classRank: testUser.academicInfo.classRank,
            classSize: testUser.academicInfo.classSize
        });
        
        // Save the page
        const isSaveSuccessful = await myHighSchoolGradesPage.save();
        expect(isSaveSuccessful).toBeTruthy();
    });

    test('Save and continue to next section', async () => {
        // Fill in required fields
        await myHighSchoolGradesPage.selectReportType('selfReportAll');
        await myHighSchoolGradesPage.enterAcademicDetails({
            unweightedGPA: testUser.academicInfo.unweightedGPA,
            classRank: testUser.academicInfo.classRank,
            classSize: testUser.academicInfo.classSize
        });
        
        // Save and continue
        await myHighSchoolGradesPage.saveAndContinue();
        
        // Verify navigation to next section
        await expect(myHighSchoolGradesPage.page).toHaveURL(/.*next-section/);
    });

    test('Validate grading system', async () => {
        // Validate the grading system dropdown is present
        const isGradingSystemValid = await myHighSchoolGradesPage.validateGradingSystem();
        expect(isGradingSystemValid).toBeTruthy();
    });

    test('Validate course title input', async () => {
        // Validate the course title input is present
        const isCourseTitleValid = await myHighSchoolGradesPage.validateCourseTitle();
        expect(isCourseTitleValid).toBeTruthy();
    });
});

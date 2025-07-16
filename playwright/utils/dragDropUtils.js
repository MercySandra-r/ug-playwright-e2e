/**
 * Drag and Drop Utilities
 * 
 * This module provides utilities for drag and drop operations.
 */

const { logger } = require('./testLogger');

/**
 * @typedef {Object} ModuleLogger
 * @property {(message: string) => void} info
 * @property {(message: string) => void} warn
 * @property {(message: string, error?: Error|unknown) => void} error
 * @property {(message: string) => void} debug
 */

/** @type {ModuleLogger} */
const moduleLogger = {
  info: (message) => logger.info(`[DragDropUtils] ${message}`),
  warn: (message) => logger.warn(`[DragDropUtils] ${message}`),
  debug: (message) => logger.debug(`[DragDropUtils] ${message}`),
  error: (message, error) => {
    if (error instanceof Error) {
      logger.error(`[DragDropUtils] ${message}`, error);
    } else if (error) {
      logger.error(`[DragDropUtils] ${message} - ${String(error)}`);
    } else {
      logger.error(`[DragDropUtils] ${message}`);
    }
  }
};

/**
 * Drag and Drop Utilities
 */
class DragDropUtils {
  /**
   * Create a new DragDropUtils instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Drag and drop element using Playwright's built-in drag and drop
   * @param {string} sourceSelector - Source element selector
   * @param {string} targetSelector - Target element selector
   * @returns {Promise<void>}
   */
  async dragAndDrop(sourceSelector, targetSelector) {
    try {
      moduleLogger.debug(`Dragging from ${sourceSelector} to ${targetSelector}`);
      
      // Ensure both elements are visible
      const source = await this.page.waitForSelector(sourceSelector, { state: 'visible' });
      const target = await this.page.waitForSelector(targetSelector, { state: 'visible' });
      
      // Perform the drag and drop
      // ElementHandle doesn't have dragTo method, so convert to locators
      await this.page.locator(sourceSelector).dragTo(this.page.locator(targetSelector));
      
      moduleLogger.debug('Drag and drop completed');
    } catch (error) {
      moduleLogger.error('Drag and drop failed', error);
      throw error;
    }
  }

  /**
   * Drag and drop using mouse actions (for cases where dragTo doesn't work)
   * @param {string} sourceSelector - Source element selector
   * @param {string} targetSelector - Target element selector
   * @returns {Promise<void>}
   */
  async dragAndDropWithMouse(sourceSelector, targetSelector) {
    try {
      moduleLogger.debug(`Dragging with mouse from ${sourceSelector} to ${targetSelector}`);
      
      // Get source and target elements
      const source = await this.page.waitForSelector(sourceSelector, { state: 'visible' });
      const target = await this.page.waitForSelector(targetSelector, { state: 'visible' });
      
      // Get bounding boxes
      const sourceBox = await source.boundingBox();
      const targetBox = await target.boundingBox();
      
      if (!sourceBox || !targetBox) {
        throw new Error('Unable to get element bounding boxes for drag and drop');
      }
      
      // Calculate source and target centers
      const sourceCenter = {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2
      };
      
      const targetCenter = {
        x: targetBox.x + targetBox.width / 2,
        y: targetBox.y + targetBox.height / 2
      };
      
      // Perform the drag and drop using mouse actions
      await this.page.mouse.move(sourceCenter.x, sourceCenter.y);
      await this.page.mouse.down();
      await this.page.mouse.move(targetCenter.x, targetCenter.y, { steps: 10 }); // Move in small steps for smoother drag
      await this.page.mouse.up();
      
      moduleLogger.debug('Mouse drag and drop completed');
    } catch (error) {
      moduleLogger.error('Error performing mouse drag and drop', error);
      throw error;
    }
  }

  /**
   * Drag and drop using JavaScript (HTML5 Drag and Drop API)
   * @param {string} sourceSelector - Source element selector
   * @param {string} targetSelector - Target element selector
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async dragAndDropWithJavaScript(sourceSelector, targetSelector) {
    try {
      moduleLogger.debug(`Dragging with JavaScript from ${sourceSelector} to ${targetSelector}`);
      
      // Execute JavaScript to perform drag and drop
      const result = await this.page.evaluate(([sourceSelector, targetSelector]) => {
        const source = document.querySelector(sourceSelector);
        const target = document.querySelector(targetSelector);
        
        if (!source || !target) {
          return { success: false, error: 'Source or target element not found' };
        }
        
        try {
          // Create a drag start event
          const dragStartEvent = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
          });
          
          // Dispatch drag start event on source
          source.dispatchEvent(dragStartEvent);
          
          // Add data to the dataTransfer
          if (dragStartEvent.dataTransfer) {
            dragStartEvent.dataTransfer.setData('text/plain', 'Dragged data');
          }
          
          // Create dragover and drop events
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dragStartEvent.dataTransfer
          });
          
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dragStartEvent.dataTransfer
          });
          
          // Dispatch events on target
          target.dispatchEvent(dragOverEvent);
          const dropResult = target.dispatchEvent(dropEvent);
          
          // Dispatch dragend event on source
          const dragEndEvent = new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dragStartEvent.dataTransfer || new DataTransfer()
          });
          
          source.dispatchEvent(dragEndEvent);
          
          return { success: true, dropped: dropResult };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      }, [sourceSelector, targetSelector]);
      
      if (!result.success) {
        moduleLogger.warn(`JavaScript drag and drop failed: ${result.error}`);
        return false;
      }
      
      moduleLogger.debug('JavaScript drag and drop completed');
      return true;
    } catch (error) {
      moduleLogger.error('Error performing JavaScript drag and drop', error);
      return false;
    }
  }

  /**
   * Drag an element by offset
   * @param {string} sourceSelector - Source element selector
   * @param {number} xOffset - X offset in pixels
   * @param {number} yOffset - Y offset in pixels
   * @returns {Promise<void>}
   */
  async dragByOffset(sourceSelector, xOffset, yOffset) {
    try {
      moduleLogger.debug(`Dragging ${sourceSelector} by offset: (${xOffset}, ${yOffset})`);
      
      // Get source element
      const source = await this.page.waitForSelector(sourceSelector, { state: 'visible' });
      
      // Get bounding box
      const sourceBox = await source.boundingBox();
      
      if (!sourceBox) {
        throw new Error('Unable to get element bounding box for drag');
      }
      
      // Calculate source center
      const sourceCenter = {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2
      };
      
      // Calculate target position
      const targetX = sourceCenter.x + xOffset;
      const targetY = sourceCenter.y + yOffset;
      
      // Perform the drag and drop using mouse actions
      await this.page.mouse.move(sourceCenter.x, sourceCenter.y);
      await this.page.mouse.down();
      await this.page.mouse.move(targetX, targetY, { steps: 10 }); // Move in small steps for smoother drag
      await this.page.mouse.up();
      
      moduleLogger.debug('Drag by offset completed');
    } catch (error) {
      moduleLogger.error('Error performing drag by offset', error);
      throw error;
    }
  }

  /**
   * Handle sortable list drag and drop (common in UI libraries like jQuery UI)
   * @param {string} listSelector - List element selector
   * @param {number} fromIndex - Source item index (0-based)
   * @param {number} toIndex - Target item index (0-based)
   * @returns {Promise<void>}
   */
  async dragSortableItem(listSelector, fromIndex, toIndex) {
    try {
      moduleLogger.debug(`Dragging sortable item from index ${fromIndex} to index ${toIndex} in ${listSelector}`);
      
      // Get all items in the list
      const items = await this.page.$$(`${listSelector} > *`);
      
      if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
        throw new Error(`Invalid indices: list has ${items.length} items, got fromIndex=${fromIndex}, toIndex=${toIndex}`);
      }
      
      const sourceItem = items[fromIndex];
      const targetItem = items[toIndex];
      
      // Get bounding boxes
      const sourceBox = await sourceItem.boundingBox();
      const targetBox = await targetItem.boundingBox();
      
      if (!sourceBox || !targetBox) {
        throw new Error('Unable to get element bounding boxes for drag and drop');
      }
      
      // Calculate source center
      const sourceCenter = {
        x: sourceBox.x + sourceBox.width / 2,
        y: sourceBox.y + sourceBox.height / 2
      };
      
      // Calculate target position (drop at the top or bottom of target item depending on direction)
      let targetY;
      if (fromIndex < toIndex) {
        // Moving down, drop after the target
        targetY = targetBox.y + targetBox.height;
      } else {
        // Moving up, drop before the target
        targetY = targetBox.y;
      }
      
      const targetX = targetBox.x + targetBox.width / 2;
      
      // Perform the drag and drop using mouse actions
      await this.page.mouse.move(sourceCenter.x, sourceCenter.y);
      await this.page.mouse.down();
      await this.page.mouse.move(targetX, targetY, { steps: 20 }); // More steps for smoother movement
      await this.page.mouse.up();
      
      // Wait a moment for the sort animation to complete
      await this.page.waitForTimeout(500);
      
      moduleLogger.debug('Sortable drag and drop completed');
    } catch (error) {
      moduleLogger.error('Error performing sortable drag and drop', error);
      throw error;
    }
  }
}

module.exports = DragDropUtils;

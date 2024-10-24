const express = require('express');
const router = express.Router();
const Customer = require('../models/customer');

// GET a specific customer by customerId
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ customerId: req.params.id });
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer', error });
  }
});

// GET accumulated data for a specific customer by customerId and date
router.get('/:id/accumulated', async (req, res) => {
  try {
    const customerId = req.params.id;
    const date = req.query.date;
    const customer = await Customer.findOne({ customerId });

    if (customer) {
      const accumulatedData = customer.accumulatedData.find(acc => acc.date === date);
      if (accumulatedData) {
        res.json(accumulatedData);
      } else {
        res.status(404).json({ message: 'No accumulated data found for the specified date' });
      }
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching accumulated data', error });
  }
});

// POST customer data
router.post('/', async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    const savedCustomer = await newCustomer.save();
    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(500).json({ message: 'Error creating customer', error });
  }
});

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error });
  }
});

// POST an operation for a specific customer by customerId
// POST an operation for a specific customer by customerId
router.post('/:id/operations', async (req, res) => {
  try {
    const customer = await Customer.findOne({ customerId: req.params.id });
    if (customer) {
      const { history, distributorId, category, price, numBoxes, boxType, weight, numUnits } = req.body;

      // Create new operation object
      const newOperation = {
        history,
        customerId: req.params.id,
        distributorId,
        category,
        price,
        numBoxes,
        boxType,
        weight,
        numUnits
      };

      // Find an operation with the same history and category
      const matchingOperation = customer.operations.find(op => op.history === history && op.category === category);

      if (matchingOperation) {
        // Update the box count based on the type of box used
        if (boxType === 'small') {
          matchingOperation.numSmallBoxes -= numBoxes;
        } else if (boxType === 'large') {
          matchingOperation.numLargeBoxes -= numBoxes;
        }
      }

      customer.operations.push(newOperation);
      await customer.save();
      res.status(201).json(customer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error adding operation', error });
  }
});


// PUT to accumulate data for a specific customer by customerId and date
router.put('/:id/accumulate', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { date } = req.query;
    
    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const operationsForDate = customer.operations.filter(op => op.history === date);
    const totalBoxCount = operationsForDate.reduce((acc, op) => acc + op.numBoxes, 0);
    const totalWeight = operationsForDate.reduce((acc, op) => acc + op.weight, 0);
    const totalPrice = operationsForDate.reduce((acc, op) => acc + (op.weight * op.price), 0);

    const existingAccumulatedData = customer.accumulatedData.find(acc => acc.date === date);
    if (existingAccumulatedData) {
      existingAccumulatedData.totalBoxCount = totalBoxCount;
      existingAccumulatedData.totalWeight = totalWeight;
      existingAccumulatedData.totalPrice = totalPrice;
    } else {
      customer.accumulatedData.push({ date, totalBoxCount, totalWeight, totalPrice });
    }

    await customer.save();
    res.status(200).json({ message: 'Accumulated data updated successfully' });
  } catch (error) {
    console.error('Error updating accumulated data:', error);
    res.status(500).json({ message: 'Error updating accumulated data', error });
  }
});

// General search route for customers, distributors, and item type with date range filtering
router.get('/search', async (req, res) => {
  const { searchText, dateFrom, dateTo, itemType } = req.query;
  
  const filters = {};

  if (searchText) {
    filters.$or = [
      { customerName: { $regex: searchText, $options: 'i' } },
      { 'operations.distributorId': { $regex: searchText, $options: 'i' } }
    ];
  }

  if (dateFrom || dateTo) {
    filters['operations.history'] = {};
    if (dateFrom) {
      filters['operations.history'].$gte = dateFrom;
    }
    if (dateTo) {
      filters['operations.history'].$lte = dateTo;
    }
  }

  if (itemType) {
    filters['operations.category'] = { $regex: itemType, $options: 'i' };
  }

  try {
    const customers = await Customer.find(filters);
    
    if (customers.length === 0) {
      return res.status(404).json({ message: 'No results found for the given criteria' });
    }

    // Flatten the operations array to return results for each operation
    const results = customers.flatMap(customer =>
      customer.operations.map(operation => ({
        name: customer.customerName,
        itemType: operation.category,
        date: operation.history,
        details: `Boxes: ${operation.numBoxes}, Weight: ${operation.weight}, Price: ${operation.price}`
      }))
    );

    res.json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ message: 'Error performing search', error });
  }
});

// POST initial boxes for a customer by customerId, history, and category
router.post('/:id/initial-boxes', async (req, res) => {
  const { id } = req.params; // Customer ID
  const { history, category, initialSmallBoxes, initialLargeBoxes } = req.body; // Data from frontend

  try {
    const customer = await Customer.findOne({ customerId: id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Find an operation with the same history and category to update the boxes
    const matchingOperation = customer.operations.find(op => op.history === history && op.category === category);
    
    if (matchingOperation) {
      // Update the existing operation
      matchingOperation.numSmallBoxes = initialSmallBoxes;
      matchingOperation.numLargeBoxes = initialLargeBoxes;
    } else {
      // Create a new operation if no match is found
      customer.operations.push({
        history,
        customerId: id,
        category,
        numSmallBoxes: initialSmallBoxes,
        numLargeBoxes: initialLargeBoxes
      });
    }

    await customer.save();
    res.status(201).json({ message: 'Initial boxes added successfully', customer });
  } catch (error) {
    console.error('Error adding initial boxes:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET initial boxes based on customer, history, and item category
router.get('/:id/initial-boxes', async (req, res) => {
  const { id } = req.params; // Customer ID
  const { history, category } = req.query; // Query parameters: history and item category

  try {
    const customer = await Customer.findOne({ customerId: id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Find operations matching the history and category
    const matchingOperation = customer.operations.find(
      (op) => op.history === history && op.category === category
    );

    if (!matchingOperation) {
      return res.status(404).json({ message: 'No matching data found' });
    }

    // Return the initial small and large boxes
    res.json({
      initialSmallBoxes: matchingOperation.numSmallBoxes,
      initialLargeBoxes: matchingOperation.numLargeBoxes
    });
  } catch (error) {
    console.error('Error fetching initial boxes:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;
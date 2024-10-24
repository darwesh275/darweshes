import React, { useState, useEffect } from 'react';
import './customers.css';
import Select from 'react-select';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import ar from 'date-fns/locale/ar';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

// Register Arabic locale for date picker
registerLocale('ar', ar);

const Customers = () => {
  // State variables for the upper panel
  const [selectedCustomer, setSelectedCustomer] = useState(null);  // For 'اختر العميل'
  const [selectedHistory, setSelectedHistory] = useState(new Date()); // For history field
  const [selectedCategory, setSelectedCategory] = useState(null); // For 'الصنف'
  const [initialSmallBoxes, setInitialSmallBoxes] = useState('');  // For 'عدد الصناديق الصغيرة الأولي'
  const [initialLargeBoxes, setInitialLargeBoxes] = useState('');  // For 'عدد الصناديق الكبيرة الأولي'
  const [upperPanelMessage, setUpperPanelMessage] = useState(''); // State for message
  const [autoFilledSmallBoxes, setAutoFilledSmallBoxes] = useState(0);  // Auto-filled small boxes
  const [autoFilledLargeBoxes, setAutoFilledLargeBoxes] = useState(0);  // Auto-filled large boxes
  const [remainingSmallBoxes, setRemainingSmallBoxes] = useState(0); // Remaining small boxes
  const [remainingLargeBoxes, setRemainingLargeBoxes] = useState(0); // Remaining large boxes
  
  // State variables for managing data input and selection
  const [history, setHistory] = useState(new Date()); // Date selected by the admin
  const [customerId, setCustomerId] = useState('');    // Selected customer ID
  const [customer, setCustomer] = useState(null);      // Selected customer object
  const [distributor, setDistributor] = useState(null); // Distributor selection
  const [distributorId, setDistributorId] = useState(''); // Distributor ID field
  const [category, setCategory] = useState(null);       // Category selection
  const [price, setPrice] = useState('');               // Price input for the operation
  const [numBoxes, setNumBoxes] = useState('');         // Number of boxes input
  const [boxType, setBoxType] = useState('small');      // Type of boxes (small or large)
  const [weight, setWeight] = useState('');             // Weight input
  const [numUnits, setUnits] = useState('');            // Number of units input
  const [message, setMessage] = useState('');           // Success message on operation submission
  const [customerOptions, setCustomerOptions] = useState([]); // Options for customer dropdown
  const [itemOptions, setItemOptions] = useState([]);   // Options for items from control page
  const [distributorOptions, setDistributorOptions] = useState([]); // Options for distributors
  const [operations, setOperations] = useState([]); // State for storing operations

  // State variables for accumulated data shown in the second panel
  const [totalBoxes, setTotalBoxes] = useState(0);  // Total number of boxes for selected date/customer
  const [totalWeight, setTotalWeight] = useState(0); // Total weight
  const [totalPrice, setTotalPrice] = useState(0);  // Total price
  const [tobacco, setTobacco] = useState('');       // Additional charges for tobacco
  const [driverTip, setDriverTip] = useState('');   // Driver tip charges
  const [finalAmount, setFinalAmount] = useState(0); // Calculated final net amount
  const [showFinalAmount, setShowFinalAmount] = useState(false); // Toggle display of final amount
  const [invoiceMessage, setInvoiceMessage] = useState(''); // Message on calculating final amount

  // Fetch item names from control page
  useEffect(() => {
    axios.get('http://localhost:5000/api/items')
      .then(response => {
        setItemOptions(response.data.map(item => ({
          value: item.id,
          label: item.itemName
        })));
      })
      .catch(error => console.error('Error fetching items:', error));
  }, []);

  // Fetch distributor options and customer options from backend on component mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/distributors')
      .then(response => {
        setDistributorOptions(response.data.map(distributor => ({
          value: distributor.distributorId,
          label: distributor.distributorName
        })));
      })
      .catch(error => console.error('Error fetching distributors:', error));
  }, []);
  
  useEffect(() => {
    axios.get('http://localhost:5000/api/customers')
      .then(response => {
        setCustomerOptions(response.data.map(customer => ({
          value: customer.customerId,
          label: customer.customerName
        })));
      })
      .catch(error => console.error('Error fetching customers:', error));
  }, []);

  // Load accumulated data for selected customer and history
  useEffect(() => {
    if (customerId && history) {
      const formattedDate = format(history, 'yyyy-MM-dd');
      axios.get(`http://localhost:5000/api/customers/${customerId}/accumulated?date=${formattedDate}`)
        .then(response => {
          const customerData = response.data;
          setTotalBoxes(customerData.totalBoxCount || 0);
          setTotalWeight(customerData.totalWeight || 0);
          setTotalPrice(customerData.totalPrice || 0);
        })
        .catch(error => console.error('Error fetching accumulated data:', error));
    }
  }, [customerId, history]);

  // Sync customer selection with customerId
  useEffect(() => {
    if (customerId) {
      const matchedCustomer = customerOptions.find(option => option.value === customerId);
      setCustomer(matchedCustomer || null);
    }
  }, [customerId, customerOptions]);

  // Load existing initial small and large boxes based on selected fields
  useEffect(() => {
    if (selectedCustomer && selectedHistory && selectedCategory) {
      const fetchInitialBoxes = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/customers/${selectedCustomer.value}/initial-boxes`, {
            params: {
              history: format(selectedHistory, 'yyyy-MM-dd'),
              category: selectedCategory.label
            }
          });
          setInitialSmallBoxes(response.data.initialSmallBoxes || 0);
          setInitialLargeBoxes(response.data.initialLargeBoxes || 0);
        } catch (error) {
          console.error('Error fetching initial boxes:', error);
        }
      };

      fetchInitialBoxes();
    }
  }, [selectedCustomer, selectedHistory, selectedCategory]);

  // Handle Upper Panel Submission for Initial Boxes
  const handleUpperPanelSubmit = async (e) => {
    e.preventDefault();
  
    const data = {
      history: format(selectedHistory, 'yyyy-MM-dd'),
      category: selectedCategory.label,
      initialSmallBoxes: parseFloat(initialSmallBoxes),
      initialLargeBoxes: parseFloat(initialLargeBoxes),
    };
  
    try {
      // Include customerId in the URL path to match the backend route
      await axios.post(`http://localhost:5000/api/customers/${selectedCustomer.value}/initial-boxes`, data);
      setUpperPanelMessage('تم إدخال البيانات بنجاح');
      
      // Reset the fields after successful submission
      setSelectedCustomer(null);
      setSelectedHistory(new Date());
      setSelectedCategory(null);
      setInitialSmallBoxes('');
      setInitialLargeBoxes('');
    } catch (error) {
      console.error('Error submitting initial boxes data:', error);
      setUpperPanelMessage('حدث خطأ أثناء إدخال البيانات');
    }
  };
  useEffect(() => {
    if (customer && history && category) {
      const fetchAutoFilledBoxes = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/customers/${customer.value}/initial-boxes`, {
            params: {
              history: format(history, 'yyyy-MM-dd'),
              category: category.label
            }
          });
          setAutoFilledSmallBoxes(response.data.initialSmallBoxes || 0);
          setAutoFilledLargeBoxes(response.data.initialLargeBoxes || 0);
        } catch (error) {
          console.error('Error fetching initial boxes for second panel:', error);
        }
      };
  
      fetchAutoFilledBoxes();
    }
  }, [customer, history, category]);
  

  // Handle distributor selection and update both name and ID fields
  const handleDistributorChange = (selectedOption) => {
    setDistributor(selectedOption);
    setDistributorId(selectedOption ? selectedOption.value : '');
  };

  // Handle distributor ID input change and sync distributor name
  const handleDistributorIdChange = (e) => {
    const id = e.target.value;
    setDistributorId(id);
    const matchedDistributor = distributorOptions.find(option => option.value === id);
    setDistributor(matchedDistributor || null);
  };

  // Handle Customer Operations submission
  const handleCustomerOperationsSubmit = async (e) => {
    e.preventDefault();

    const currentNumBoxes = parseFloat(numBoxes) || 0;
    const currentWeight = parseFloat(weight) || 0;
    const currentPrice = parseFloat(price) || 0;
    const currentUnits = parseFloat(numUnits) || 0;
    const formattedDate = format(history, 'yyyy-MM-dd');

    const currentOperation = {
      history: formattedDate,
      customerId,
      distributor: distributor ? distributor.label : '',
      distributorId: distributorId,
      category: category ? category.label : '',
      price: currentPrice,
      numBoxes: currentNumBoxes,
      boxType, // Box type (small or large)
      weight: currentWeight,
      numUnits: currentUnits
    };

    const newTotalBoxes = totalBoxes + currentNumBoxes;
    const newTotalWeight = totalWeight + currentWeight;
    const newTotalPrice = totalPrice + (currentWeight * currentPrice);

    setTotalBoxes(newTotalBoxes);
    setTotalWeight(newTotalWeight);
    setTotalPrice(newTotalPrice);
    setOperations(prevOps => [...prevOps, currentOperation]);

    try {
      // Submit the operation to the backend
      await axios.post(`http://localhost:5000/api/customers/${customerId}/operations`, currentOperation);

      // Fetch updated initial boxes after submitting the operation
      const response = await axios.get(`http://localhost:5000/api/customers/${customerId}/initial-boxes`, {
        params: {
          history: formattedDate,
          category: category ? category.label : ''
        }
      });

      // Update the remaining boxes after decrementing the box count
      if (boxType === 'small') {
        setInitialSmallBoxes(response.data.initialSmallBoxes - currentNumBoxes);
      } else if (boxType === 'large') {
        setInitialLargeBoxes(response.data.initialLargeBoxes - currentNumBoxes);
      }

      // Display the updated remaining boxes in the third panel (Customer Invoice)
      setRemainingSmallBoxes(response.data.initialSmallBoxes || 0);
      setRemainingLargeBoxes(response.data.initialLargeBoxes || 0);

      setMessage('تم إدخال البيانات بنجاح');
    } catch (error) {
      console.error('Error saving operation data:', error);
      setMessage('حدث خطأ أثناء إدخال البيانات');
    }

    // Reset form fields after submission
    setDistributor(null);
    setDistributorId('');
    setCategory(null);
    setPrice('');
    setNumBoxes('');
    setWeight('');
    setUnits('');
};


  // Calculate commission based on total price (8%)
  const commission = totalPrice * 0.08;

  // Calculate and show final result for Customer Invoice
  const handleShowFinalResult = (e) => {
    e.preventDefault();
    const finalValue = totalPrice - (commission + (parseFloat(driverTip) || 0) + (parseFloat(tobacco) || 0));
    setFinalAmount(finalValue);
    setShowFinalAmount(true);
    setInvoiceMessage('تم حساب الناتج النهائي');
  };

  return (
    <div className="customers-page" id="pdf-content">
      <div className="panel fady-square">
        <h2 className="header-name">ادخال الصناديق الأولية</h2>
        <form onSubmit={handleUpperPanelSubmit}>
          <div className="row full-width">
            {/* Customer Selection */}
            <div className="form-group">
              <label>اختر العميل</label>
              <Select
                options={customerOptions}
                value={selectedCustomer}
                onChange={(selectedOption) => setSelectedCustomer(selectedOption)}
                placeholder="اختر العميل"
              />
            </div>

            {/* History Field */}
            <div className="form-group">
              <label>التاريخ</label>
              <DatePicker
                selected={selectedHistory}
                onChange={(date) => setSelectedHistory(date)}
                locale="ar"
                placeholderText="اختر التاريخ"
                dateFormat="dd/MM/yyyy"
                calendarStartDay={6}
                className="date-picker"
              />
            </div>

            {/* Category Selection */}
            <div className="form-group">
              <label>اختر الصنف</label>
              <Select
                options={itemOptions}
                value={selectedCategory}
                onChange={(selectedOption) => setSelectedCategory(selectedOption)}
                placeholder="اختر الصنف"
              />
            </div>
          </div>

          <div className="row full-width">
            {/* Initial Large Boxes */}
            <div className="form-group">
              <label>عدد الصناديق الكبيرة الأولي</label>
              <input
                type="number"
                value={initialLargeBoxes}
                onChange={(e) => setInitialLargeBoxes(e.target.value)}
                placeholder="ادخل عدد الصناديق الكبيرة الأولية"
                required
              />
            </div>

            {/* Initial Small Boxes */}
            <div className="form-group">
              <label>عدد الصناديق الصغيرة الأولي</label>
              <input
                type="number"
                value={initialSmallBoxes}
                onChange={(e) => setInitialSmallBoxes(e.target.value)}
                placeholder="ادخل عدد الصناديق الصغيرة الأولية"
                required
              />
            </div>
          </div>

          <button type="submit">أدخل البيانات</button>
          {upperPanelMessage && (
            <div className="message-container">
               <p className="centered-large-message">{upperPanelMessage}</p>
            </div>)}
        </form>
      </div>
    <div className="panel fady-square">
      <h2 className="header-name">عمليات العملاء</h2>
      <form onSubmit={handleCustomerOperationsSubmit}>
        
        {/* First Row: التاريخ, الرقم التعريفي, اختر العميل */}
        <div className="row full-width">
          <div className="form-group">
            <label>التاريخ</label>
            <DatePicker
              selected={history}
              onChange={(date) => setHistory(date)}
              locale="ar"
              placeholderText="اختر التاريخ"
              dateFormat="dd/MM/yyyy"
              calendarStartDay={6}
              className="date-picker"
            />
          </div>
          <div className="form-group">
            <label>الرقم التعريفي</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="أدخل الرقم التعريفي"
              required
            />
          </div>
          <div className="form-group">
            <label>اختر العميل</label>
            <Select
              options={customerOptions}
              value={customer}
              onChange={(selectedOption) => {
                setCustomer(selectedOption);
                setCustomerId(selectedOption ? selectedOption.value : '');
              }}
              placeholder="اختر العميل"
            />
          </div>
        </div>
      <div className="row full-width">
        <div className="form-group">
          <label>عدد الصناديق الصغيرة الأولي</label>
          <input
            type="number"
            value={autoFilledSmallBoxes}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>عدد الصناديق الكبيرة الأولي</label>
          <input
            type="number"
            value={autoFilledLargeBoxes}
            readOnly
          />
        </div>
      </div>
      {/* Second Row: اختر الموزع, رقم الموزع, اختر الصنف */}
      <div className="row full-width">
        <div className="form-group">
          <label>اختر الموزع</label>
          <Select
            options={distributorOptions}
            value={distributor}
            onChange={handleDistributorChange}
            placeholder="اختر الموزع"
          />
        </div>
        <div className="form-group">
          <label>رقم الموزع</label>
          <input
            type="text"
            value={distributorId}
            onChange={handleDistributorIdChange}
            placeholder="أدخل الرقم التعريفي"
            required
          />
        </div>
        <div className="form-group">
          <label>اختر الصنف</label>
          <Select
            options={itemOptions}
            value={category}
            onChange={setCategory}
            placeholder="اختر الصنف"
          />
        </div>
      </div>

      {/* Third Row: سعر الصنف, عدد الصناديق, نوع الصناديق */}
      <div className="row full-width">
        <div className="form-group">
          <label>سعر الصنف</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>عدد الصناديق</label>
          <input
            type="number"
            value={numBoxes}
            onChange={(e) => setNumBoxes(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>نوع الصناديق</label>
          <select
            value={boxType}
            onChange={(e) => setBoxType(e.target.value)}
            required
          >
            <option value="small">صناديق صغيرة</option>
            <option value="large">صناديق كبيرة</option>
          </select>
        </div>
      </div>

      {/* Fourth Row: الوزن (كيلو), عدد الوحدات */}
      <div className="row full-width">
        <div className="form-group">
          <label>الوزن (كيلو)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>عدد الوحدات</label>
          <input
            type="number"
            value={numUnits}
            onChange={(e) => setUnits(e.target.value)}
          />
        </div>
      </div>

      <button type="submit">أدخل البيانات</button>
      {message && (
        <div className="message-container">
          <p className="centered-large-message">{message}</p>
        </div>
      )}
    </form>
  </div>
  <div className="panel fady-square">
    {/* Customer Invoice Section */}
    <h2 className="header-name">فاتورة العميل</h2>
      <form onSubmit={handleShowFinalResult}>
        <div className="row">
          <div className="form-group">
            <label>عدد الصناديق الكلي</label>
            <input
              type="number"
              value={totalBoxes}
              readOnly
            />
          </div>
          <div className="form-group">
            <label>الميزان الكلي</label>
            <input
              type="number"
              value={totalWeight}
              readOnly
            />
          </div>
          <div className="form-group">
            <label>السعر الكلي</label>
            <input
              type="number"
              value={totalPrice}
              readOnly
            />
          </div>
        </div>

        {/* New Row for Remaining Boxes */}
        <div className="row">
          <div className="form-group">
            <label>عدد الصناديق الكبيرة المتبقية</label>
            <input
              type="number"
              value={remainingLargeBoxes}  // State for remaining large boxes
              readOnly
            />
          </div>
          <div className="form-group">
            <label>عدد الصناديق الصغيرة المتبقية</label>
            <input
              type="number"
              value={remainingSmallBoxes}  // State for remaining small boxes
              readOnly
            />
          </div>
        </div>

        <div className="row">
          <div className="form-group">
            <label>العمولة</label>
            <input
              type="number"
              value={commission}
              readOnly
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label>الدخان</label>
            <input
              type="number"
              value={tobacco}
              onChange={(e) => setTobacco(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>ناولون السائق</label>
            <input
              type="number"
              value={driverTip}
              onChange={(e) => setDriverTip(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>المبلغ الخالص</label>
            <input
              type="number"
              value={finalAmount}
              readOnly
              style={{ visibility: showFinalAmount ? 'visible' : 'hidden' }}
            />
          </div>
        </div>

        <button type="submit">اعرض الناتج النهائي</button>
        {invoiceMessage && (
          <div className="message-container">
            <p className="centered-large-message">{invoiceMessage}</p>
          </div>
        )}
    </form>
    </div>
  </div>
  );
};

export default Customers;

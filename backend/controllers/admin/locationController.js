const { countries, states, cities } = require('../../models');
const helper = require('../../helpers/helper');

module.exports = {
  // Countries
  getCountries: async (req, res) => {
    try {
      const result = await countries.findAll({ order: [['name', 'ASC']] });
      return helper.success(res, "Countries retrieved successfully", result);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  addCountry: async (req, res) => {
    const { name, code } = req.body;
    try {
      if (!name) return helper.failed(res, "Country name is required");
      const newCountry = await countries.create({ name, code });
      return helper.success(res, "Country added successfully", newCountry);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  updateCountry: async (req, res) => {
    const { id } = req.params;
    const { name, code } = req.body;
    try {
      const country = await countries.findOne({ where: { id } });
      if (!country) return helper.failed(res, "Country not found");
      await country.update({ name, code });
      return helper.success(res, "Country updated successfully", country);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  toggleCountryStatus: async (req, res) => {
    const { id } = req.params;
    try {
      const country = await countries.findOne({ where: { id } });
      if (!country) return helper.failed(res, "Country not found");
      const newStatus = country.status === 'active' ? 'inactive' : 'active';
      await country.update({ status: newStatus });
      return helper.success(res, "Country status updated", country);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  deleteCountry: async (req, res) => {
    const { id } = req.params;
    try {
      const country = await countries.findOne({ where: { id } });
      if (!country) return helper.failed(res, "Country not found");
      await country.destroy();
      return helper.success(res, "Country deleted successfully");
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },

  // States
  getStates: async (req, res) => {
    const { countryId } = req.query;
    try {
      const where = countryId ? { countryId } : {};
      const result = await states.findAll({ where, order: [['name', 'ASC']] });
      return helper.success(res, "States retrieved successfully", result);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  addState: async (req, res) => {
    const { name, countryId } = req.body;
    try {
      if (!name || !countryId) return helper.failed(res, "State name and country ID are required");
      const newState = await states.create({ name, countryId });
      return helper.success(res, "State added successfully", newState);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  updateState: async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
      const state = await states.findOne({ where: { id } });
      if (!state) return helper.failed(res, "State not found");
      await state.update({ name });
      return helper.success(res, "State updated successfully", state);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  toggleStateStatus: async (req, res) => {
    const { id } = req.params;
    try {
      const state = await states.findOne({ where: { id } });
      if (!state) return helper.failed(res, "State not found");
      const newStatus = state.status === 'active' ? 'inactive' : 'active';
      await state.update({ status: newStatus });
      return helper.success(res, "State status updated", state);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  deleteState: async (req, res) => {
    const { id } = req.params;
    try {
      const state = await states.findOne({ where: { id } });
      if (!state) return helper.failed(res, "State not found");
      await state.destroy();
      return helper.success(res, "State deleted successfully");
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },

  // Cities
  getCities: async (req, res) => {
    const { stateId } = req.query;
    try {
      const where = stateId ? { stateId } : {};
      const result = await cities.findAll({ where, order: [['name', 'ASC']] });
      return helper.success(res, "Cities retrieved successfully", result);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  addCity: async (req, res) => {
    const { name, stateId } = req.body;
    try {
      if (!name || !stateId) return helper.failed(res, "City name and state ID are required");
      const newCity = await cities.create({ name, stateId });
      return helper.success(res, "City added successfully", newCity);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  updateCity: async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
      const city = await cities.findOne({ where: { id } });
      if (!city) return helper.failed(res, "City not found");
      await city.update({ name });
      return helper.success(res, "City updated successfully", city);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  toggleCityStatus: async (req, res) => {
    const { id } = req.params;
    try {
      const city = await cities.findOne({ where: { id } });
      if (!city) return helper.failed(res, "City not found");
      const newStatus = city.status === 'active' ? 'inactive' : 'active';
      await city.update({ status: newStatus });
      return helper.success(res, "City status updated", city);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },
  deleteCity: async (req, res) => {
    const { id } = req.params;
    try {
      const city = await cities.findOne({ where: { id } });
      if (!city) return helper.failed(res, "City not found");
      await city.destroy();
      return helper.success(res, "City deleted successfully");
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  }
};

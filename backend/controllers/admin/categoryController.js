const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { services_categories } = db;

module.exports = {

  categoryList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      let whereClause = {};
      if (search) whereClause.categoryName = { [Op.like]: `%${search}%` };

      const { count, rows } = await services_categories.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Categories fetched', {
        list: rows,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  createCategory: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        categoryName: 'required|string'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      let image = null;
      if (req.files && req.files.image) {
        image = await helper.fileUpload(req.files.image, 'categories');
      }

      const category = await services_categories.create({
        categoryName: req.body.categoryName,
        image,
        status: 1
      });

      return helper.success(res, 'Category created successfully', category);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await services_categories.findOne({ where: { id } });
      if (!category) return helper.failed(res, 'Category not found');

      const updateData = {};
      if (req.body.categoryName) updateData.categoryName = req.body.categoryName;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      if (req.files && req.files.image) {
        updateData.image = await helper.fileUpload(req.files.image, 'categories');
      }

      await category.update(updateData);
      return helper.success(res, 'Category updated successfully', category);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await services_categories.findOne({ where: { id } });
      if (!category) return helper.failed(res, 'Category not found');
      await category.destroy();
      return helper.success(res, 'Category deleted successfully');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  toggleCategoryStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await services_categories.findOne({ where: { id } });
      if (!category) return helper.failed(res, 'Category not found');
      await category.update({ status: category.status ? 0 : 1 });
      return helper.success(res, 'Category status toggled');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};

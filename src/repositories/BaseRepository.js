const { Op } = require('sequelize');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(options = {}) {
    return this.model.findAll(options);
  }

  async findAndCountAll(options = {}) {
    return this.model.findAndCountAll(options);
  }

  async findOne(where, options = {}) {
    return this.model.findOne({ where, ...options });
  }

  async findById(id, options = {}) {
    return this.model.findByPk(id, options);
  }

  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  async bulkCreate(data, options = {}) {
    return this.model.bulkCreate(data, options);
  }

  async update(data, where, options = {}) {
    return this.model.update(data, { where, ...options });
  }

  async updateById(id, data, options = {}) {
    const instance = await this.findById(id);
    if (!instance) return null;
    return instance.update(data, options);
  }

  async delete(where, options = {}) {
    return this.model.destroy({ where, ...options });
  }

  async deleteById(id) {
    return this.model.destroy({ where: { id } });
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async exists(where) {
    const count = await this.model.count({ where });
    return count > 0;
  }
}

module.exports = BaseRepository;

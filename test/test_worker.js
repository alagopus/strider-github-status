'use strict';

var chai = require('chai');
var sinon = require('sinon');

var EventEmitter = require('events');
var worker = require('../worker');

chai.use(require('sinon-chai'));
var expect = chai.expect;

describe('github-status worker', function () {
  var config = {};
  var context = {};
  var job = {
    _id: Date.now().toString(32),
    project: {
      creator: {
        account: sinon.stub()
      },
      name: 'test-project',
      provider: {
        config: {
          owner: 'project-owner',
          repo: 'project-repo'
        }
      }
    },
    ref: {},
    trigger: {}
  };

  function addAccount(job) {
    job.project.creator.account = sinon.stub().returns({ config: { accessToken: '!secret!' }});
  }

  it('should call empty callback without commit', function (done) {
    var empty = Object.assign({}, job);
    var callback = sinon.stub();
    worker.init(config, empty, context, callback);
    expect(callback).to.have.been.calledOnce;
    expect(callback).to.have.been.calledWith(null, {});
    done();
  });

  it('should reject config without account', function (done) {
    var commit = Object.assign({}, job);
    commit.trigger.type = 'commit';

    var callback = sinon.stub();
    worker.init(config, commit, context, callback);
    expect(callback).to.have.been.not.called;
    done();
  });

  it('should provide a listener for a commit', function (done) {
    var commit = Object.assign({}, job);
    commit.trigger.type = 'commit';
    commit.ref.id = Date.now().toString(16);
    addAccount(commit);

    var callback = sinon.stub();
    worker.init(config, commit, context, callback);
    expect(callback).to.have.been.calledOnce;

    var listener = callback.args[0][1];
    expect(listener).to.have.property('listen').which.is.a('function');

    var emitter = new EventEmitter();
    var emit = sinon.spy(emitter, 'emit');
    listener.listen(emitter);
    expect(emit).to.have.been.calledWith('plugin.github-status.started', job._id, 'test-project');
    emitter.emit('job.status.tested');
    expect(emit).to.have.been.calledWith('plugin.github-status.done');
    done();
  });

  it('should provide a listener for a PR', function (done) {
    var request = Object.assign({}, job);
    request.plugin_data = { github: { pull_request:{ sha: Date.now().toString(16) } } };
    addAccount(request);

    var callback = sinon.stub();
    worker.init(config, request, context, callback);
    expect(callback).to.have.been.calledOnce;

    var listener = callback.args[0][1];
    expect(listener).to.have.property('listen').which.is.a('function');

    var emitter = new EventEmitter();
    var emit = sinon.spy(emitter, 'emit');
    listener.listen(emitter);
    expect(emit).to.have.been.calledWith('plugin.github-status.started', job._id, 'test-project');
    emitter.emit('job.status.tested');
    expect(emit).to.have.been.calledWith('plugin.github-status.done');
    done();
  });

});
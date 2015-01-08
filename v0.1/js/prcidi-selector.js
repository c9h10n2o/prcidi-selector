/* *
 * PrCiDiSelector Control
 * Version 0.1.150107
 * jQuery 1.4.2 Tested
 * Project Home: http://github.com/c9h10n2o/prcidi-selector
 * Any donation would be appreciated! :)
 * (C) 2014 JiangXiao
 * http://sometime.me
 * someone@sometime.me
 * */

var PrCiDiSelector = function() {
    return this.init.apply(this, arguments);
};

PrCiDiSelector.prototype = {

    constructor: PrCiDiSelector

,    options: {
        uiField: null   // Data type: Selector string | DOM node | jQuery object
    ,   placeHolderSelector: '请选择'
    ,   placeHolderLevel: '请选择'
    ,   preset: {   // Default name and value
            name: ''
        ,   value: ''
        }

    ,   level: 2   // 0:Province 1:City 2:District
    ,   levelTypes: ['省', '市', '区/县']   // Or '省|市|区/县'
    ,   municipalities: ['北京市', '上海市', '天津市', '重庆市', '香港特区', '澳门特区']
        // Or '北京市|上海市|...'

    ,   apiPattern: ''
        // data.json?level=%LEVEL%&value=%VALUE%
        // ['data-level0.json?level=%LEVEL%&value=%VALUE%', ...]
        // The query string is optional
    ,   extraData: null
    }

,   $uiField: null
,   $uiSelector: null
,   $uiDropdown: null
,   $uiLevelTabbar: null
,   $uiLevelBodies: []

,   result: {
        name: []
    ,   value: []
    }

    // Initialize

,   init: function (options) {
        var opt = this.options;

        $.extend(opt, options || {});
        
        this.$uiField = $(opt.uiField);
        // Specific text field not found
        if(!this.$uiField[0]) return null;

        if(!opt.levelTypes.pop)
            opt.levelTypes = opt.levelTypes.split('|');
        if(!opt.municipalities.pop)
            opt.municipalities = opt.municipalities.split('|');

        this.createSelector();
        this.createDropdown();
        this.bindEvents();

        return this;
    }

    // Replace the field element with the proxy selector

,   createSelector: function() {
        var opt = this.options;

        this.$uiSelector = $('<div>')
            .addClass('prcidi-selector prcidi-ctrl')
            .text(opt.preset.name || opt.placeHolderSelector);
        this.$uiField
            .val(opt.preset.value || '')
            .hide()
            .after(this.$uiSelector);

        return this.$uiSelector;
    }

    // Create the dropdown layer

,    createDropdown: function() {
        var that = this
        ,    opt = this.options;

        this.$uiDropdown = $('<div>')
            .addClass('prcidi-dropdown prcidi-ctrl')
            .css('position', 'absolute')
            .hide()
            .appendTo('body');

        // Create the tabbar

        var levelTypes = opt.levelTypes.slice(0, opt.level + 1);

        this.$uiLevelTabbar = $('<ul>').addClass('level-tabbar');
        $.grep(levelTypes, function(k, i) {
           $('<li>')
                .attr('data-level', i)
                .text(opt.placeHolderLevel + k)
                .addClass(i ? 'disabled' : 'active')
                .appendTo(that.$uiLevelTabbar);
        });
        this.$uiDropdown.append(this.$uiLevelTabbar);

        return this.$uiDropdown;
    }


    // Snap the dropdown layer to the selector element

 ,   snapDropdown: function() {
        return this.$uiDropdown
            .css({
                left: this.$uiSelector.offset().left
            ,   top: this.$uiSelector.offset().top + this.$uiSelector[0].offsetHeight
            });
    }

    // Bind all events

 ,   bindEvents: function() {
        var that = this
        ,   opt = this.options;

        this.$uiSelector
            .bind('click', function() {
                that.snapDropdown()
                    .toggle(200);
                //     .fadeToggle(200);
                $(this).toggleClass('active');

                if($(this).hasClass('active')) {
                    that.$uiLevelTabbar
                        .find('[data-level=0]')
                        .trigger('click');

                    that.loadLevel(0);                
                }
            })

        $(document).bind('click', function(e) {
            var $uiTarget = $(e.target);

            !$uiTarget.hasClass('prcidi-selector') &&
            !$uiTarget.hasClass('prcidi-dropdown') &&
            !$uiTarget.parents('.prcidi-selector')[0] &&
            !$uiTarget.parents('.prcidi-dropdown')[0] &&
            that.$uiSelector
                .filter('.active')
                .trigger('click');
        });

        this.$uiLevelTabbar
            .find('li')
            .bind('click', function() {
                var level = $(this).attr('data-level')
                ,   $uiLevelBody = that.$uiLevelBodies[level];

                if($(this).hasClass('disabled')) return;

                if(!$uiLevelBody)
                    $uiLevelBody = that.$uiLevelBodies[level] =
                        $('<ul>')
                            .addClass('level-body clearfix')
                            .attr('data-level', level)
                            .hide()
                            .insertAfter(that.$uiLevelTabbar);

                $(this)
                    .addClass('active')
                    .siblings()
                    .removeClass('active');
                that.$uiDropdown
                    .find('.level-body')
                    .hide();

                $uiLevelBody.show();
            });

        $('.prcidi-dropdown .level-body li')
            .live('mouseenter', function() { $(this).addClass('hover') })
            .live('mouseleave', function() { $(this).removeClass('hover') })
            .live('click', function() {
                var level = $(this).parent().attr('data-level') / 1
                ,   name = $(this).text()
                ,   value = $(this).attr('data-value')
                ,   isMunicipality = !!$(this).attr('data-municipality');

                $(this)
                    .addClass('active')
                    .siblings()
                    .removeClass('active');

                level < opt.level && that.clearLevel(level + 1);
                that.setLevel(level, name, value, isMunicipality);
            });
    }

    // Load data for specific level

 ,  loadLevel: function(level, value) {
        var that = this
        ,   opt = this.options
        ,   level = level || 0
        ,   value = value || ''
        ,   $uiLevelBody = this.$uiLevelBodies[level]
        ,   apiPattern = opt.apiPattern.pop ? opt.apiPattern[level] : opt.apiPattern
        ,   api = '';

        // Set default pattern of the query string
        if(apiPattern.indexOf('?') < 0) apiPattern += '?level=%LEVEL%&value=%VALUE%';
        api = apiPattern
            .replace(/\%LEVEL\%/ig, level)
            .replace(/\%VALUE\%/ig, value);

       // AJAX callback  - SUCC
        function succ(data) {
            $uiLevelBody.html('');
            $.grep(data.data, function(k) {
                var $uiLi = $('<li>')
                ,   isMunicipality = $.inArray(k.name, opt.municipalities) >= 0;

                !level && isMunicipality &&
                    $uiLi.attr('data-municipality', isMunicipality);
                
                $uiLi
                    .text(k.name)
                    .attr('data-value', k.value)
                    .appendTo($uiLevelBody);
            });

            $uiLevelBody.removeClass('loading');
        }

        // AJAX callback  - FAIL
        function fail(xhr, statusText) {
            // console.log(xhr, statusText);
            alert('加载数据时出现错误：' + statusText);

            $uiLevelBody.removeClass('loading');
        }

        // Cache the root level
        if(!level && $uiLevelBody.html()) return;

        $uiLevelBody
            .html('')
            .addClass('loading')
            .siblings()
            .removeClass('loading');

        $.ajax({
            dataType: 'json'
        ,   url: api
        ,   cache: false
        ,   data: opt.extraData
        ,   success: succ
        ,   error: fail
        });
    }

    // Set the result of one level

,   setLevel: function(level, name, value, isMunicipality) {
        var opt = this.options
        ,   $uiLevelTab = this.$uiLevelTabbar
            .find('[data-level=' + level + ']')
        ,   isDiffValue = value != $uiLevelTab.attr('data-value')
        ,   nextLevel = level + 1 + isMunicipality / 1;

        isMunicipality
        ? $uiLevelTab.next().hide(200)
        : $uiLevelTab.next().show(200);

        $uiLevelTab
            .text(name)
            .attr('data-value', value);

        this.result.name[level] = name;
        this.result.value[level] = value;

        if(level < opt.level) {
            this.$uiLevelTabbar
                .find('[data-level=' + (nextLevel) + ']')
                .removeClass('disabled')
                .trigger('click');

            isDiffValue && this.loadLevel(nextLevel, value);
        }
        else {
            this.updateResult();
            this.$uiSelector.trigger('click');
        }

        // this.updateResult();    // Update immediately
    }

    // Clear the result of one level

,   clearLevel: function(level) {
        var opt = this.options
        ,   level = level || 0
        ,   $uiLevelTab
        ,   $uiLevelBody;

        this.result.name = this.result.name.slice(0, level);
        this.result.value = this.result.value.slice(0, level);

        while(level <= opt.level) {
            $uiLevelTab = this.$uiLevelTabbar
                .find('[data-level=' + level + ']')
            $uiLevelBody = this.$uiLevelBodies[level];
            $uiLevelTab
                .text(opt.placeHolderLevel + opt.levelTypes[level])
                .removeAttr('data-value')
                .addClass('disabled');
            $uiLevelBody &&
                $uiLevelBody
                    .find('.active')
                    .removeClass('active');
            level++;
        }
    }

    // Update the final result

,   updateResult: function() {
        var nameStr = this.result.name.join('')
        ,   valueStr = this.result.value
            .join('-')
            .replace('--', '-');

        this.$uiField
            .val(valueStr)
            .trigger('change');
        this.$uiSelector.text(nameStr);
        this.$uiSelector.attr('data-value', valueStr);
    }
};
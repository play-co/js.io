/**
* JSONSchema Validator
* ====================
*
* Validates JavaScript objects using JSON Schemas
* http://json-schema.org/
*
* Based on jsonschema-b4.js:
*   Copyright (c) 2007 Kris Zyp SitePen (www.sitepen.com)
*   Licensed under the MIT (MIT-LICENSE.txt) license.
*
* To use the validator call JSONSchema.validate with an instance object
* and an optional schema object. If a schema is provided, it will be used
* to validate. If the instance object refers to a schema
* (self-validating), that schema will be used to validate and the schema
* parameter is not necessary (if both exist, both validations will
* occur). The validate method will return an array of validation errors.
* If there are no errors, then an empty list will be returned. A
* validation error will have two properties:
*	1. "property" - the property that had the error
*	2. "message" - the error message
*/

// JSONSchema:
exports = {
	// function (instance, schema):
	// 		To use the validator call JSONSchema.validate with an instance object and an optional schema object.
	// 		If a schema is provided, it will be used to validate. If the instance object refers to a schema (self-validating),
	// 		that schema will be used to validate and the schema parameter is not necessary (if both exist,
	// 		both validations will occur).
	// 		The validate method will return an object with two properties:
	// 			valid: A boolean indicating if the instance is valid by the schema
	// 			errors: An array of validation errors. If there are no errors, then an
	// 					empty list will be returned. A validation error will have two properties:
	// 						property: which indicates which property had the error
	// 						message: which indicates what the error was
	//
	validate: validate,

	// Summary:
	// 		The checkPropertyChange method will check to see if a value can legally be in a property with the given schema
	// 		This is slightly different than the validate method in that it will fail if the schema is readonly and it will
	// 		not check for self-validation, it is assumed that the passed in value is already internally valid.
	// 		The checkPropertyChange method will return the same object type as validate, see JSONSchema.validate for
	// 		information.
	//
	checkPropertyChange: function(/*Any*/value,/*Object*/schema, /*String*/ property) {
		return validate(value, schema, property || "property");
	}
}

var gCheckPropChange = false;
function validate(instance, schema, property) {
	gCheckPropChange = property;

	var errors = schema ? checkProp(instance, schema, '', property || '') : [];
	if (!property && instance && instance.$schema) {
		checkProp(instance, instance.$schema, '', '', errors);
	}

	return {
		valid: !errors.length,
		errors: errors
	};
}

// validate a value against a property definition
function checkProp(value, schema, path, i, errors) {
	if (!errors) { errors = []; }

	path +=
		path ? typeof i == 'number' ? '[' + i + ']'
			 : typeof i == 'undefined' ? '' : '.' + i : i;

	function addError(message) {
		errors.push({
			property: path,
			message:message
		});
	}

	var schemaType = typeof schema,
		isObject = schemaType == 'object',
		isFunction = schemaType == 'function';

	if ((!isObject || Array.isArray(schema)) && (path || !isFunction)) {
		if (isFunction) {
			if (!(value instanceof schema)) {
				addError("is not an instance of the class/constructor " + schema.name);
			}
		} else if (schema) {
			addError("Invalid schema/property definition " + schema);
		}

		return errors;
	}

	if (gCheckPropChange && schema.readonly) { addError("is a readonly field, it can not be changed"); }

	// if it extends another schema, it must pass that schema as well
	if (schema['extends']) { checkProp(value, schema['extends'], path, i, errors); }

	if (value === undefined) {
		if (!schema.optional) { addError("is missing and it is not optional"); }
	} else {
		errors = errors.concat(checkType(schema.type,value));
		if (schema.disallow && !checkType(schema.disallow,value).length) { addError(" disallowed value was matched"); }

		if (value !== null) {
			if (Array.isArray(value)) {
				if (schema.items) {
					if (Array.isArray(schema.items)) {
						for (i=0,l=value.length; i<l; i++) {
							errors.concat(checkProp(value[i],schema.items[i],path,i, errors));
						}
					} else {
						for (i=0,l=value.length; i<l; i++) {
							errors.concat(checkProp(value[i],schema.items,path,i, errors));
						}
					}
				}
				if (schema.minItems && value.length < schema.minItems) {
					addError("There must be a minimum of " + schema.minItems + " in the array");
				}
				if (schema.maxItems && value.length > schema.maxItems) {
					addError("There must be a maximum of " + schema.maxItems + " in the array");
				}
			} else if (schema.properties) {
				errors.concat(checkObj(value, schema.properties, path, schema.additionalProperties, errors));
			}
			if (schema.pattern && typeof value == 'string' && !value.match(schema.pattern)) {
				addError("does not match the regex pattern " + schema.pattern);
			}
			if (schema.maxLength && typeof value == 'string' && value.length > schema.maxLength) {
				addError("may only be " + schema.maxLength + " characters long");
			}
			if (schema.minLength && typeof value == 'string' && value.length < schema.minLength) {
				addError("must be at least " + schema.minLength + " characters long");
			}
			if (typeof schema.minimum !== undefined
					&& typeof value == typeof schema.minimum
					&& schema.minimum > value)
			{
				addError("must have a minimum value of " + schema.minimum);
			}
			if (typeof schema.maximum !== undefined
					&& typeof value == typeof schema.maximum
					&& schema.maximum < value)
			{
				addError("must have a maximum value of " + schema.maximum);
			}

			if (schema['enum']) {

				var enumer = schema['enum'],
					found;

				var l = enumer.length;
				for(var j = 0; j < l; j++) {
					if (enumer[j]===value) {
						found=1;
						break;
					}
				}

				if (!found) { addError("does not have a value in the enumeration " + enumer.join(", ")); }
			}
			if (typeof schema.maxDecimal == 'number' &&
			(value.toString().match(new RegExp("\\.[0-9]{" + (schema.maxDecimal + 1) + ",}")))) {
				addError("may only have " + schema.maxDecimal + " digits of decimal places");
			}
		}
	}

	return errors;
}

// validate an object against a schema
function checkObj(instance, objTypeDef, path, additionalProp, errors) {

	if (typeof objTypeDef =='object') {
		if (typeof instance != 'object' || Array.isArray(instance)) {
			errors.push({
				property: path,
				message: "an object is required"
			});
		}

		for(var i in objTypeDef) {
			if (objTypeDef.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_')) {
				var value = instance[i];
				var propDef = objTypeDef[i];
				checkProp(value,propDef,path,i, errors);
			}
		}
	}

	for(i in instance) {
		if (instance.hasOwnProperty(i)
				&& !(i.charAt(0) == '_'
				&& i.charAt(1) == '_')
				&& objTypeDef
				&& !objTypeDef[i]
				&& additionalProp === false)
		{
			errors.push({
				property: path,
				message: (typeof value) + "The property " + i +
					" is not defined in the schema and the schema does not allow additional properties"
			});
		}

		var requires = objTypeDef && objTypeDef[i] && objTypeDef[i].requires;
		if (requires && !(requires in instance)) {
			errors.push({
				property: path,
				message: "the presence of the property " + i + " requires that "
					+ requires + " also be present"
			});
		}

		value = instance[i];
		if (objTypeDef && typeof objTypeDef == 'object' && !(i in objTypeDef)) {
			checkProp(value, additionalProp, path, i, errors);
		}

		if (!gCheckPropChange && value && value.$schema) {
			errors = errors.concat(checkProp(value, value.$schema, path, i, errors));
		}
	}

	return errors;
}

// validate a value against a type definition
function checkType(type, value, errors) {
	if (type) {
		var actualType = typeof value;

		if (typeof type == 'string') {
			type = type.toLowerCase();
			switch(type) {
				case 'any':
					return [];
				case 'array':
					if (!Array.isArray(value)) {
						return [{
							property: path,
							message: 'expected an array, but ' + actualType + ' found instead'
						}];
					}
					break;
				case 'integer':
				case 'int':
					type = 'integer';
					break;
				case 'float':
				case 'double':
				case 'number':
					type = 'number';
					// fall through
				default:
					if (actualType != type) {
						return [{
							property: path,
							message: 'expected ' + type + ', but ' + actualType + ' found instead'
						}];
					}
					break;
			}
			return [];
		}

		if (Array.isArray(type)) {
			var unionErrors = [];
			for(var j = 0; j < type.length; j++) { // a union type
				var errs = checkType(type[j], value, errors);
				if (!errs.length) { return []; }
				unionErrors = unionErrors.concat(errs);
			}
			return unionErrors;
		} else if (typeof type == 'object') {
			return checkProp(value, type, path);
		}
	}

	return [];
}

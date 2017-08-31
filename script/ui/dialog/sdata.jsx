import { h } from 'preact';
import { connect } from 'preact-redux';
import { Form, Field, SelectOneOf } from '../component/form';
import Dialog from '../component/dialog';
import ComboBox from '../component/combobox';
import { sdataSchema, getSdataDefault } from '../data/sdata-schema'
/** @jsx h */

function SelectInput({ title, name, schema, ...prop }) {
	const inputSelect = Object.keys(schema).reduce((acc, item) => {
			acc.enum.push(item);
			acc.enumNames.push(schema[item].title || item);
			return acc;
		},
		{
			title: title,
			type: 'string',
			default: '',
			minLength: 1,
			enum: [],
			enumNames: []
		}
	);

	return <Field name={name} schema={inputSelect} component={ComboBox} {...prop} />
}

const customFieldNameSchema = {
	key: 'Custom',
	properties: {
		type: { enum: ["DAT"] },
		context: {
			title: 'Context',
			enum: [
				'Fragment',
				'Bond',
				'Atom',
				'Group'
			],
			default: 'Fragment'
		},
		fieldName: {
			title: 'Field name',
			type: "string",
			default: "",
			minLength: 1,
			invalidMessage: "Please, specify field name"
		},
		fieldValue: {
			title: 'Field value',
			type: "string",
			default: "",
			minLength: 1,
			invalidMessage: "Please, specify field value"
		},
		radiobuttons: {
			enum: [
				"Absolute",
				"Relative",
				"Attached"
			],
			default: "Absolute"
		}
	},
	required: ["context", "fieldName", "fieldValue", "radiobuttons"]
};

function SData({ formState, ...prop }) {
	const { result, valid } = formState;

	const context = result.context;
	const fieldName = result.fieldName;

	const init = {
		context,
		fieldName: fieldName || getSdataDefault(context),
		type,
		radiobuttons
	};

	init.fieldValue = fieldValue || getSdataDefault(context, init.fieldName);

	const formSchema = sdataSchema[context][fieldName] || customFieldNameSchema;

	const serialize = {
		context: context.trim(),
		fieldName: fieldName.trim(),
		fieldValue: result.fieldValue.trim()
	};

	return (
		<Dialog title={"S-Group Properties"} className="sgroup"
				result={() => result} valid={() => valid} params={prop}>
            <Form {...formState} serialize={serialize} schema={formSchema} init={init} >
                <SelectOneOf title="Context" name="context" schema={sdataSchema}/>
                <fieldset className={"data"}>
                    <SelectInput title="Field name" name="fieldName" schema={sdataSchema[context]}/>
                    {
                        content(formSchema, context, fieldName)
                    }
                </fieldset>
            </Form>
		</Dialog>
	);
}

const content = (schema, context, fieldName) => Object.keys(schema.properties)
	.filter(prop => prop !== "type" && prop !== "context" && prop !== "fieldName")
	.map(prop => prop === "radiobuttons" ?
		<Field name={prop} type="radio" key={`${context}-${fieldName}-${prop}-radio`}/> :
		<Field name={prop} type="textarea" size="10" key={`${context}-${fieldName}-${prop}-select`}/>
	);

export default connect(
	(store) => ({ formState: store.modal.form })
)(SData);
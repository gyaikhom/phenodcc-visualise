/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import java.io.Serializable;
import java.util.List;
import javax.xml.bind.annotation.XmlElement;

/**
 * The structure of the parameter data that is returned by the
 * ParameterFacadeREST web service.
 *
 * @author gyaikhom
 */
public class ParameterData implements Serializable {

    private Integer parameterId;
    private String stableid;
    private String parameterName;
    // IMPReSS does not associate procedures and parameters uniquely. Hence, for
    // a given parameter key, it may be associated with multiple procedures.
    private List<Integer> procedureId;
    private Integer procedureType; // usd by heatmap
    private Integer weight;
    private Integer graphType;
    private String datatype;
    private String unit;
    private Integer incrementId;
    private String incrementValue;
    private String incrementType;
    private String incrementUnit;
    private Integer incrementMin;
    private List<String> options;
    private String embryoStage;

    public ParameterData() {
    }

    public ParameterData(Integer parameterId, String stableid,
            String parameterName, Integer weight, Integer graphType,
            String datatype, String unit, Integer incrementId,
            String incrementValue, String incrementType,
            String incrementUnit, Integer incrementMin, List<String> options,
            String embryoStage) {
        this.parameterId = parameterId;
        this.stableid = stableid;
        this.parameterName = parameterName;
        this.weight = weight;
        this.graphType = graphType;
        this.datatype = datatype;
        this.unit = unit;
        this.incrementId = incrementId;
        this.incrementValue = incrementValue;
        this.incrementType = incrementType;
        this.incrementUnit = incrementUnit;
        this.incrementMin = incrementMin;
        this.options = options;
        this.embryoStage = embryoStage;
    }

    @XmlElement(name = "d")
    public String getDatatype() {
        return datatype;
    }

    public void setDatatype(String datatype) {
        this.datatype = datatype;
    }

    @XmlElement(name = "ii")
    public Integer getIncrementId() {
        return incrementId;
    }

    public void setIncrementId(Integer incrementId) {
        this.incrementId = incrementId;
    }

    @XmlElement(name = "im")
    public Integer getIncrementMin() {
        return incrementMin;
    }

    public void setIncrementMin(Integer incrementMin) {
        this.incrementMin = incrementMin;
    }

    @XmlElement(name = "it")
    public String getIncrementType() {
        return incrementType;
    }

    public void setIncrementType(String incrementType) {
        this.incrementType = incrementType;
    }

    @XmlElement(name = "iu")
    public String getIncrementUnit() {
        return incrementUnit;
    }

    public void setIncrementUnit(String incrementUnit) {
        this.incrementUnit = incrementUnit;
    }

    @XmlElement(name = "iv")
    public String getIncrementValue() {
        return incrementValue;
    }

    public void setIncrementValue(String incrementValue) {
        this.incrementValue = incrementValue;
    }

    @XmlElement(name = "id")
    public Integer getParameterId() {
        return parameterId;
    }

    public void setParameterId(Integer parameterId) {
        this.parameterId = parameterId;
    }

    @XmlElement(name = "n")
    public String getParameterName() {
        return parameterName;
    }

    public void setParameterName(String parameterName) {
        this.parameterName = parameterName;
    }

    @XmlElement(name = "s")
    public Integer getWeight() {
        return weight;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    @XmlElement(name = "e")
    public String getStableid() {
        return stableid;
    }

    @XmlElement(name = "t")
    public Integer getGraphType() {
        return graphType;
    }

    public void setGraphType(Integer graphType) {
        this.graphType = graphType;
    }

    public void setStableid(String stableid) {
        this.stableid = stableid;
    }

    @XmlElement(name = "u")
    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    @XmlElement(name = "o")
    public List<String> getOptions() {
        return options;
    }

    public void setOptions(List<String> options) {
        this.options = options;
    }

    @XmlElement(name = "p")
    public List<Integer> getProcedureId() {
        return procedureId;
    }

    public void setProcedureId(List<Integer> procedureId) {
        this.procedureId = procedureId;
    }

    @XmlElement(name = "pt")
    public Integer getProcedureType() {
        return procedureType;
    }

    public void setProcedureType(Integer procedureType) {
        this.procedureType = procedureType;
    }

    @XmlElement(name = "em")
    public String getEmbryoStage() {
        return embryoStage;
    }

    public void setEmbryoStage(String embryoStage) {
        this.embryoStage = embryoStage;
    }
    
}
